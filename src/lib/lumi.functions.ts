import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  getMaster,
  getService,
  TIME_SLOTS,
} from "@/lib/catalog";
import { isSlotPast, phoneDigits } from "@/lib/format";
import {
  ensureTelegramWebhook,
  notifyAdmin,
  requireAdmin,
  resolveClient,
} from "@/lib/telegram.server";

const identitySchema = z.object({
  initData: z.string().optional(),
  previewId: z.string().optional(),
});

export type BookingDto = {
  id: number;
  telegramId: string;
  clientName: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  masterId: string;
  masterName: string;
  date: string;
  time: string;
  price: number;
  hasAllergy: boolean;
  allergyNote: string;
  comment: string;
  status: string;
  createdAt: string;
};

type BookingRow = {
  id: number;
  telegram_id: string;
  client_name: string;
  phone: string;
  service_id: string;
  service_name: string;
  master_id: string;
  master_name: string;
  date: string;
  time: string;
  price: number;
  has_allergy: boolean;
  allergy_note: string;
  comment: string;
  status: string;
  created_at: Date | string;
};

function mapBooking(row: BookingRow): BookingDto {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    clientName: row.client_name,
    phone: row.phone,
    serviceId: row.service_id,
    serviceName: row.service_name,
    masterId: row.master_id,
    masterName: row.master_name,
    date: row.date,
    time: row.time,
    price: row.price,
    hasAllergy: Boolean(row.has_allergy),
    allergyNote: row.allergy_note ?? "",
    comment: row.comment ?? "",
    status: row.status,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

async function hiddenIds() {
  const sql = await getSql();
  const rows = await sql<{ service_id: string }>`
    select service_id from hidden_services
  `;
  return rows.map((row) => row.service_id);
}

export const getBootstrap = createServerFn({ method: "POST" })
  .validator(identitySchema)
  .handler(async ({ data }) => {
    const session = resolveClient(data);
    try {
      await ensureTelegramWebhook();
    } catch {
      // Preview / missing token — ignore.
    }
    return {
      telegramId: session.telegramId,
      isAdmin: session.isAdmin,
      firstName: session.firstName,
      hiddenServiceIds: await hiddenIds(),
    };
  });

export const getTakenSlots = createServerFn({ method: "POST" })
  .validator(
    z.object({
      masterId: z.string(),
      date: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ time: string }>`
      select time from bookings
      where master_id = ${data.masterId}
        and date = ${data.date}
        and status <> 'cancelled'
    `;
    return rows.map((row) => row.time);
  });

export const listMyBookings = createServerFn({ method: "POST" })
  .validator(identitySchema)
  .handler(async ({ data }) => {
    const session = resolveClient(data);
    const sql = await getSql();
    const rows = await sql<BookingRow>`
      select * from bookings
      where telegram_id = ${session.telegramId}
      order by created_at desc
    `;
    return rows.map(mapBooking);
  });

export const createBooking = createServerFn({ method: "POST" })
  .validator(
    identitySchema.extend({
      serviceId: z.string(),
      masterId: z.string(),
      date: z.string(),
      time: z.string(),
      hasAllergy: z.boolean(),
      allergyNote: z.string().max(400),
      clientName: z.string().min(2).max(80),
      phone: z.string().min(5).max(32),
      comment: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = resolveClient(data);
    const service = getService(data.serviceId);
    const master = getMaster(data.masterId);
    if (!service) throw new Error("Услуга не найдена");
    if (!master) throw new Error("Мастер не найден");
    if (!master.categoryIds.includes(service.categoryId)) {
      throw new Error("Этот мастер не выполняет выбранную услугу");
    }
    const hidden = await hiddenIds();
    if (hidden.includes(service.id)) {
      throw new Error("Эта услуга сейчас скрыта");
    }
    if (!(TIME_SLOTS as readonly string[]).includes(data.time)) {
      throw new Error("Выберите другое время");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || isSlotPast(data.date, data.time)) {
      throw new Error("Это время уже недоступно");
    }
    const name = data.clientName.trim();
    const phone = data.phone.trim();
    if (phoneDigits(phone).length < 10) {
      throw new Error("Укажите телефон полностью");
    }
    const allergyNote = data.hasAllergy ? data.allergyNote.trim() : "";
    if (data.hasAllergy && allergyNote.length < 2) {
      throw new Error("Укажите, на что аллергия");
    }

    const sql = await getSql();
    const taken = await sql<{ id: number }>`
      select id from bookings
      where master_id = ${master.id}
        and date = ${data.date}
        and time = ${data.time}
        and status <> 'cancelled'
      limit 1
    `;
    if (taken.length > 0) {
      throw new Error("Это время уже занято. Выберите другой слот.");
    }

    const inserted = await sql<BookingRow>`
      insert into bookings (
        telegram_id, client_name, phone,
        service_id, service_name, master_id, master_name,
        date, time, price, has_allergy, allergy_note, comment, status
      ) values (
        ${session.telegramId}, ${name}, ${phone},
        ${service.id}, ${service.name}, ${master.id}, ${master.name},
        ${data.date}, ${data.time}, ${service.price},
        ${data.hasAllergy}, ${allergyNote}, ${data.comment?.trim() ?? ""},
        'new'
      )
      returning *
    `;
    const row = inserted[0];
    if (!row) throw new Error("Не удалось сохранить запись");
    const booking = mapBooking(row);
    await notifyAdmin({
      id: booking.id,
      service_name: booking.serviceName,
      master_name: booking.masterName,
      date: booking.date,
      time: booking.time,
      price: booking.price,
      client_name: booking.clientName,
      phone: booking.phone,
      has_allergy: booking.hasAllergy,
      allergy_note: booking.allergyNote,
      comment: booking.comment,
    });
    return booking;
  });

export const listAdminBookings = createServerFn({ method: "POST" })
  .validator(identitySchema.extend({ status: z.string().optional() }))
  .handler(async ({ data }) => {
    requireAdmin(data);
    const sql = await getSql();
    const rows = data.status
      ? await sql<BookingRow>`
          select * from bookings
          where status = ${data.status}
          order by created_at desc
        `
      : await sql<BookingRow>`
          select * from bookings
          order by case when status = 'new' then 0 else 1 end, created_at desc
        `;
    return rows.map(mapBooking);
  });

export const updateBookingStatus = createServerFn({ method: "POST" })
  .validator(
    identitySchema.extend({
      id: z.number(),
      status: z.enum(["new", "confirmed", "done", "cancelled"]),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin(data);
    const sql = await getSql();
    const rows = await sql<BookingRow>`
      update bookings set status = ${data.status}
      where id = ${data.id}
      returning *
    `;
    if (!rows[0]) throw new Error("Запись не найдена");
    return mapBooking(rows[0]);
  });

export const setServiceHidden = createServerFn({ method: "POST" })
  .validator(
    identitySchema.extend({
      serviceId: z.string(),
      hidden: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin(data);
    if (!getService(data.serviceId)) throw new Error("Услуга не найдена");
    const sql = await getSql();
    if (data.hidden) {
      await sql`
        insert into hidden_services (service_id)
        values (${data.serviceId})
        on conflict (service_id) do nothing
      `;
    } else {
      await sql`
        delete from hidden_services where service_id = ${data.serviceId}
      `;
    }
    return { hiddenServiceIds: await hiddenIds() };
  });
