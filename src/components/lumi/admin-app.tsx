import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BOOKING_STATUSES,
  CATEGORIES,
  SERVICES,
  getMaster,
} from "@/lib/catalog";
import { formatDateTime, formatPrice } from "@/lib/format";
import {
  getBootstrap,
  listAdminBookings,
  setServiceHidden,
  updateBookingStatus,
  type BookingDto,
} from "@/lib/lumi.functions";
import { identityPayload, initTelegramUi } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/lumi/app-shell";
import { ScreenHeader } from "@/components/lumi/screen-header";
import { StatusPill } from "@/components/lumi/status-pill";

type Tab = "bookings" | "services";

export function AdminApp() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("bookings");
  const [filter, setFilter] = useState<string>("new");
  const [bookings, setBookings] = useState<BookingDto[] | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function loadSession() {
    const session = await getBootstrap({ data: identityPayload() });
    setAllowed(session.isAdmin);
    setHiddenIds(session.hiddenServiceIds);
    return session.isAdmin;
  }

  async function loadBookings(status: string) {
    const rows = await listAdminBookings({
      data: {
        ...identityPayload(),
        status: status === "all" ? undefined : status,
      },
    });
    setBookings(rows);
  }

  useEffect(() => {
    initTelegramUi();
    void (async () => {
      try {
        const ok = await loadSession();
        if (ok) await loadBookings("new");
      } catch (err) {
        setAllowed(false);
        setError(err instanceof Error ? err.message : "Нет доступа");
      }
    })();
  }, []);

  async function changeStatus(
    id: number,
    status: "new" | "confirmed" | "done" | "cancelled",
  ) {
    setError("");
    try {
      await updateBookingStatus({
        data: { ...identityPayload(), id, status },
      });
      await loadBookings(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить статус");
    }
  }

  async function toggleHidden(serviceId: string, hidden: boolean) {
    setError("");
    try {
      const result = await setServiceHidden({
        data: { ...identityPayload(), serviceId, hidden },
      });
      setHiddenIds(result.hiddenServiceIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось скрыть услугу");
    }
  }

  if (allowed === null) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Открываем админку…</p>
      </AppShell>
    );
  }

  if (!allowed) {
    return (
      <AppShell>
        <ScreenHeader title="Админ" />
        <p className="text-sm leading-relaxed text-muted">
          Админка доступна только администратору студии.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-rose px-5 text-sm font-medium text-on-rose"
        >
          На главную
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ScreenHeader
        title="Админ"
        action={
          <Link to="/" className="text-sm font-medium text-muted">
            К студии
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
        <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")}>
          Записи
        </TabButton>
        <TabButton
          active={tab === "services"}
          onClick={() => setTab("services")}
        >
          Услуги
        </TabButton>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {tab === "bookings" ? (
        <>
          <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
            {[
              { id: "new", label: "новые" },
              { id: "all", label: "все" },
              ...BOOKING_STATUSES.filter((item) => item.id !== "new"),
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilter(item.id);
                  setBookings(null);
                  void loadBookings(item.id).catch((err: unknown) => {
                    setError(
                      err instanceof Error ? err.message : "Не удалось загрузить",
                    );
                    setBookings([]);
                  });
                }}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-medium",
                  filter === item.id
                    ? "bg-rose text-on-rose"
                    : "bg-surface text-muted shadow-card",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          {bookings === null ? (
            <p className="text-sm text-muted">Загружаем…</p>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl bg-surface p-6 shadow-card">
              <p className="font-medium">Новых записей нет</p>
              <p className="mt-1 text-sm text-muted">
                Когда клиент запишется, заявка появится здесь.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {bookings.map((booking) => (
                <AdminBookingCard
                  key={booking.id}
                  booking={booking}
                  onStatus={(status) => void changeStatus(booking.id, status)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          {CATEGORIES.map((category) => (
            <section key={category.id}>
              <h2 className="mb-3 font-display text-xl font-medium">
                {category.name}
              </h2>
              <div className="flex flex-col gap-3">
                {SERVICES.filter((item) => item.categoryId === category.id).map(
                  (service) => {
                    const hidden = hiddenIds.includes(service.id);
                    return (
                      <div
                        key={service.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 shadow-card"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {service.name}
                          </p>
                          <p className="text-xs text-muted">
                            {formatPrice(service.price)}
                            {hidden ? " · скрыта" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleHidden(service.id, !hidden)}
                          className={cn(
                            "h-9 shrink-0 rounded-full px-3 text-xs font-medium",
                            hidden
                              ? "bg-rose-soft text-rose-deep"
                              : "bg-surface-2 text-muted",
                          )}
                        >
                          {hidden ? "Показать" : "Скрыть"}
                        </button>
                      </div>
                    );
                  },
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-xl text-sm font-medium transition-colors duration-150",
        active ? "bg-surface text-ink shadow-card" : "text-muted",
      )}
    >
      {children}
    </button>
  );
}

function AdminBookingCard({
  booking,
  onStatus,
}: {
  booking: BookingDto;
  onStatus: (status: "new" | "confirmed" | "done" | "cancelled") => void;
}) {
  const master = getMaster(booking.masterId);
  return (
    <article className="rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Запись #{booking.id}</p>
          <h2 className="mt-1 font-medium leading-snug">{booking.serviceName}</h2>
        </div>
        <StatusPill status={booking.status} />
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <Info label="Мастер" value={booking.masterName} />
        <Info
          label="Время"
          value={formatDateTime(booking.date, booking.time)}
        />
        <Info label="Имя" value={booking.clientName} />
        <Info label="Телефон" value={booking.phone} />
        <Info
          label="Аллергия"
          value={
            booking.hasAllergy ? booking.allergyNote || "да" : "нет"
          }
        />
        <Info label="Цена" value={formatPrice(booking.price)} />
      </dl>
      {master ? (
        <img
          src={master.photo}
          alt=""
          className="mt-4 h-16 w-16 rounded-2xl object-cover"
        />
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {BOOKING_STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStatus(item.id)}
            className={cn(
              "h-10 rounded-2xl text-xs font-medium",
              booking.status === item.id
                ? "bg-rose text-on-rose"
                : "bg-surface-2 text-muted",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

