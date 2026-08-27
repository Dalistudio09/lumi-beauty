import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getRequest } from "@tanstack/react-start/server";
import { formatDateTime, formatPrice } from "./format";

export const ADMIN_TELEGRAM_ID = "743736933";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

export type ClientSession = {
  telegramId: string;
  isAdmin: boolean;
  firstName: string;
};

type BookingNotice = {
  id: number;
  service_name: string;
  master_name: string;
  date: string;
  time: string;
  price: number;
  client_name: string;
  phone: string;
  has_allergy: boolean;
  allergy_note: string;
  comment: string;
};

function tokenFromDotenv() {
  try {
    const text = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key !== "TELEGRAM_BOT_TOKEN") continue;
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  } catch {
    return "";
  }
  return "";
}

export function getBotToken() {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").trim() || tokenFromDotenv();
}

export function publicOriginFromRequest(request?: Request) {
  const req = request ?? getRequest();
  const url = new URL(req.url);
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (url.protocol === "http:" ? "http" : "https");
  return `${proto}://${host}`;
}

export function verifyInitData(initData: string, token: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const digest = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  const left = Buffer.from(digest, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  const authDate = Number(params.get("auth_date") ?? "0");
  if (authDate && Date.now() / 1000 - authDate > 60 * 60 * 24) {
    return null;
  }
  const raw = params.get("user");
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as TelegramUser;
    if (typeof user.id !== "number") return null;
    return user;
  } catch {
    return null;
  }
}

export function resolveClient(input: {
  initData?: string;
  previewId?: string;
}): ClientSession {
  const token = getBotToken();
  const initData = input.initData?.trim() ?? "";
  if (token && initData) {
    const user = verifyInitData(initData, token);
    if (!user) {
      throw new Error("Сессия Telegram недействительна");
    }
    return {
      telegramId: String(user.id),
      isAdmin: String(user.id) === ADMIN_TELEGRAM_ID,
      firstName: user.first_name ?? "",
    };
  }
  if (token) {
    return {
      telegramId: input.previewId?.trim() || "web-guest",
      isAdmin: false,
      firstName: "",
    };
  }
  return {
    telegramId: input.previewId?.trim() || "preview-client",
    isAdmin: true,
    firstName: "Preview",
  };
}

export function requireAdmin(input: {
  initData?: string;
  previewId?: string;
}) {
  const session = resolveClient(input);
  if (!session.isAdmin) {
    throw new Error("Нет доступа");
  }
  return session;
}

async function telegramCall(method: string, payload: Record<string, unknown>) {
  const token = getBotToken();
  if (!token) return { ok: false as const, description: "no token" };
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return (await response.json()) as {
    ok: boolean;
    description?: string;
  };
}

const startCaption = [
  "Lumi",
  "Студия красоты",
  "",
  "Маникюр, педикюр, брови, ресницы и шугаринг.",
  "Выберите услугу и мастера — запись займёт пару минут.",
].join("\n");

function webAppKeyboard(appUrl: string) {
  return {
    keyboard: [
      [
        {
          text: "Записаться",
          web_app: { url: appUrl },
        },
      ],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

export async function sendStartMessage(chatId: number, origin: string) {
  const appUrl = origin.startsWith("https://") ? origin : "";
  const markup = appUrl ? webAppKeyboard(appUrl) : undefined;
  const photoUrl = appUrl ? `${appUrl}/images/studio.jpg` : "";
  if (photoUrl) {
    const photoResult = await telegramCall("sendPhoto", {
      chat_id: chatId,
      photo: photoUrl,
      caption: startCaption,
      ...(markup ? { reply_markup: markup } : {}),
    });
    if (photoResult.ok) return;
  }
  const uploaded = await sendLocalStudioPhoto(chatId, markup);
  if (uploaded) return;
  await telegramCall("sendMessage", {
    chat_id: chatId,
    text: startCaption,
    ...(markup ? { reply_markup: markup } : {}),
  });
}

async function sendLocalStudioPhoto(
  chatId: number,
  markup: ReturnType<typeof webAppKeyboard> | undefined,
) {
  const token = getBotToken();
  if (!token) return false;
  try {
    const bytes = readFileSync(join(process.cwd(), "public/images/studio.jpg"));
    const form = new FormData();
    form.set("chat_id", String(chatId));
    form.set("caption", startCaption);
    if (markup) form.set("reply_markup", JSON.stringify(markup));
    form.set("photo", new Blob([bytes], { type: "image/jpeg" }), "studio.jpg");
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      { method: "POST", body: form },
    );
    const body = (await response.json()) as { ok?: boolean };
    return Boolean(body.ok);
  } catch {
    return false;
  }
}

export function formatAdminNotice(booking: BookingNotice) {
  const allergy = booking.has_allergy
    ? booking.allergy_note.trim() || "да"
    : "нет";
  return [
    `Новая запись #${booking.id}`,
    `Услуга: ${booking.service_name}`,
    `Мастер: ${booking.master_name}`,
    `Дата и время: ${formatDateTime(booking.date, booking.time)}`,
    `Цена: ${formatPrice(booking.price)}`,
    `Имя: ${booking.client_name}`,
    `Телефон: ${booking.phone}`,
    `Аллергия: ${allergy}`,
    `Комментарий: ${booking.comment.trim() || "—"}`,
  ].join("\n");
}

export async function notifyAdmin(booking: BookingNotice) {
  try {
    await telegramCall("sendMessage", {
      chat_id: ADMIN_TELEGRAM_ID,
      text: formatAdminNotice(booking),
    });
  } catch {
    // Booking is already saved — Telegram delivery must not roll it back.
  }
}

let webhookReadyFor: string | null = null;

export async function ensureTelegramWebhook(origin?: string) {
  const token = getBotToken();
  if (!token) return { ok: false, reason: "no token" as const };
  const resolved = origin ?? publicOriginFromRequest();
  if (!resolved.startsWith("https://")) {
    return { ok: false, reason: "http" as const };
  }
  const url = `${resolved}/api/telegram/webhook`;
  if (webhookReadyFor === url) return { ok: true, url };
  await telegramCall("setMyCommands", { commands: [] });
  const result = await telegramCall("setWebhook", {
    url,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  if (result.ok) webhookReadyFor = url;
  return { ok: result.ok, url, description: result.description };
}

export async function handleTelegramUpdate(
  update: { message?: { chat?: { id?: number }; text?: string } },
  origin: string,
) {
  const text = update.message?.text?.trim() ?? "";
  const chatId = update.message?.chat?.id;
  if (!chatId) return;
  if (!text.startsWith("/start")) return;
  await sendStartMessage(chatId, origin);
}
