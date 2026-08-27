import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Check } from "lucide-react";
import {
  CATEGORIES,
  STUDIO_IMAGE,
  TIME_SLOTS,
  getCategory,
  getMaster,
  getService,
  mastersForService,
  servicesForCategory,
  startingPrice,
  type CategoryId,
} from "@/lib/catalog";
import {
  dayNumber,
  firstOpenDate,
  formatDateRu,
  formatDateTime,
  formatDuration,
  formatPhoneInput,
  formatPrice,
  isSlotPast,
  phoneDigits,
  upcomingDays,
  weekdayShort,
} from "@/lib/format";
import {
  createBooking,
  getBootstrap,
  getTakenSlots,
  listMyBookings,
  type BookingDto,
} from "@/lib/lumi.functions";
import {
  getTelegram,
  identityPayload,
  initTelegramUi,
} from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/lumi/app-shell";
import { Field, TextArea, TextInput } from "@/components/lumi/field";
import { ScreenHeader } from "@/components/lumi/screen-header";
import { StatusPill } from "@/components/lumi/status-pill";

type Screen =
  | "home"
  | "services"
  | "masters"
  | "schedule"
  | "allergy"
  | "contacts"
  | "success"
  | "bookings";

const DAYS = upcomingDays(14);
const INITIAL_DATE = firstOpenDate(DAYS, TIME_SLOTS);

export function BookingApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<CategoryId | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [date, setDate] = useState(INITIAL_DATE);
  const [time, setTime] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [hasAllergy, setHasAllergy] = useState<boolean | null>(null);
  const [allergyNote, setAllergyNote] = useState("");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<BookingDto | null>(null);
  const [mine, setMine] = useState<BookingDto[] | null>(null);

  const category = categoryId ? getCategory(categoryId) : undefined;
  const service = serviceId ? getService(serviceId) : undefined;
  const master = masterId ? getMaster(masterId) : undefined;
  const visibleServices = categoryId
    ? servicesForCategory(categoryId, hiddenIds)
    : [];
  const availableMasters = serviceId ? mastersForService(serviceId) : [];

  useEffect(() => {
    initTelegramUi();
    void getBootstrap({ data: identityPayload() })
      .then((session) => {
        setIsAdmin(session.isAdmin);
        setHiddenIds(session.hiddenServiceIds);
        const user = getTelegram()?.initDataUnsafe?.user;
        if (user?.first_name && !clientName) {
          setClientName(user.first_name);
        }
      })
      .catch(() => {
        // Catalog still renders from the local seed.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;
    const goBack = () => goBackScreen();
    if (screen === "home" || screen === "success") {
      tg.BackButton.hide();
      return;
    }
    tg.BackButton.show();
    tg.BackButton.onClick(goBack);
    return () => {
      tg.BackButton.offClick(goBack);
      tg.BackButton.hide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (!masterId || !date || screen !== "schedule") return;
    void getTakenSlots({ data: { masterId, date } })
      .then(setTaken)
      .catch(() => setTaken([]));
  }, [masterId, date, screen]);

  function resetFlow() {
    setScreen("home");
    setCategoryId(null);
    setServiceId(null);
    setMasterId(null);
    setDate(INITIAL_DATE);
    setTime("");
    setHasAllergy(null);
    setAllergyNote("");
    setError("");
    setCreated(null);
  }

  function goBackScreen() {
    setError("");
    if (screen === "services") {
      setScreen("home");
      return;
    }
    if (screen === "masters") {
      setScreen("services");
      return;
    }
    if (screen === "schedule") {
      setScreen("masters");
      return;
    }
    if (screen === "allergy") {
      setScreen("schedule");
      return;
    }
    if (screen === "contacts") {
      setScreen("allergy");
      return;
    }
    if (screen === "bookings") {
      setScreen("home");
    }
  }

  async function openMine() {
    setError("");
    setScreen("bookings");
    setMine(null);
    try {
      setMine(await listMyBookings({ data: identityPayload() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить записи");
      setMine([]);
    }
  }

  async function submit() {
    if (!service || !master || !date || !time || hasAllergy === null) return;
    if (hasAllergy && allergyNote.trim().length < 2) {
      setError("Укажите, на что аллергия");
      return;
    }
    if (clientName.trim().length < 2) {
      setError("Напишите имя");
      return;
    }
    if (phoneDigits(phone).length < 10) {
      setError("Укажите телефон полностью");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const booking = await createBooking({
        data: {
          ...identityPayload(),
          serviceId: service.id,
          masterId: master.id,
          date,
          time,
          hasAllergy,
          allergyNote,
          clientName: clientName.trim(),
          phone: formatPhoneInput(phone),
        },
      });
      setCreated(booking);
      setScreen("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить запись");
    } finally {
      setSubmitting(false);
    }
  }

  const openCategories = CATEGORIES.filter(
    (item) => servicesForCategory(item.id, hiddenIds).length > 0,
  );

  return (
    <AppShell>
      {screen === "home" && (
        <HomeScreen
          isAdmin={isAdmin}
          categories={openCategories}
          hiddenIds={hiddenIds}
          onOpenCategory={(id) => {
            setError("");
            setCategoryId(id);
            setServiceId(null);
            setMasterId(null);
            setScreen("services");
          }}
          onMine={openMine}
        />
      )}

      {screen === "services" && category && (
        <>
          <ScreenHeader title={category.name} onBack={goBackScreen} />
          <div className="flex flex-col gap-4">
            {visibleServices.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setError("");
                  setServiceId(item.id);
                  setMasterId(null);
                  setScreen("masters");
                }}
                className="w-full rounded-xl bg-surface p-4 text-left shadow-card touch-manipulation"
              >
                <h2 className="text-base font-medium leading-snug">
                  {item.name}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {formatDuration(item.durationMin)} · {formatPrice(item.price)}
                </p>
                <span className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-rose text-sm font-medium tracking-wide text-on-rose">
                  Выбрать мастера
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {screen === "masters" && service && (
        <>
          <ScreenHeader title="Мастер" onBack={goBackScreen} />
          <p className="mb-5 text-sm text-muted">{service.name}</p>
          <div className="flex flex-col gap-5">
            {availableMasters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setError("");
                  setMasterId(item.id);
                  setTime("");
                  setScreen("schedule");
                }}
                className="relative isolate aspect-[3/4] w-full overflow-hidden rounded-xl text-left shadow-card touch-manipulation"
              >
                <img
                  src={item.photo}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 size-full select-none object-cover object-[center_18%] outline-none"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 via-ink/35 to-transparent px-4 pb-4 pt-24">
                  <span className="block font-display text-[1.75rem] font-medium leading-none text-cream">
                    {item.name}
                  </span>
                  <span className="mt-1.5 block text-sm text-cream/80">
                    {item.specialty} · {item.experience}
                  </span>
                  <span className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-surface/92 text-sm font-medium tracking-wide text-ink shadow-card backdrop-blur-[6px]">
                    Выбрать
                  </span>
                </span>
              </button>
            ))}
            {availableMasters.length === 0 && (
              <p className="text-sm text-muted">
                Для этой услуги сейчас нет мастера.
              </p>
            )}
          </div>
        </>
      )}

      {screen === "schedule" && service && master && (
        <ScheduleScreen
          serviceName={service.name}
          masterName={master.name}
          date={date}
          time={time}
          taken={taken}
          onBack={goBackScreen}
          onDate={setDate}
          onTime={setTime}
          onNext={() => {
            if (!time) {
              setError("Выберите время");
              return;
            }
            setError("");
            setScreen("allergy");
          }}
          error={error}
        />
      )}

      {screen === "allergy" && (
        <>
          <ScreenHeader title="Аллергия" onBack={goBackScreen} />
          <p className="mb-6 text-base leading-relaxed">
            Есть ли аллергия на материалы, краску или составы?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={hasAllergy === false ? "primary" : "secondary"}
              onClick={() => {
                setHasAllergy(false);
                setAllergyNote("");
                setError("");
              }}
            >
              Нет
            </Button>
            <Button
              variant={hasAllergy === true ? "primary" : "secondary"}
              onClick={() => setHasAllergy(true)}
            >
              Да
            </Button>
          </div>
          {hasAllergy ? (
            <div className="mt-6">
              <Field label="Укажите, на что">
                <TextArea
                  value={allergyNote}
                  onChange={(event) => setAllergyNote(event.target.value)}
                  placeholder="Например, гель-лак или краска для бровей"
                />
              </Field>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <Button
            className="mt-8"
            disabled={
              hasAllergy === null ||
              (hasAllergy && allergyNote.trim().length < 2)
            }
            onClick={() => {
              setError("");
              setScreen("contacts");
            }}
          >
            Далее
          </Button>
        </>
      )}

      {screen === "contacts" && service && master && (
        <>
          <ScreenHeader title="Контакты" onBack={goBackScreen} />
          <div className="mb-6 rounded-xl bg-surface p-4 shadow-card">
            <p className="text-sm text-muted">Запись</p>
            <p className="mt-1 font-medium">{service.name}</p>
            <p className="mt-1 text-sm text-muted">
              {master.name} · {formatDateTime(date, time)}
            </p>
            <p className="mt-2 font-medium">{formatPrice(service.price)}</p>
          </div>
          <div className="flex flex-col gap-4">
            <Field label="Имя">
              <TextInput
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                autoComplete="name"
                placeholder="Как к вам обращаться"
              />
            </Field>
            <Field label="Телефон">
              <TextInput
                value={phone}
                onChange={(event) =>
                  setPhone(formatPhoneInput(event.target.value))
                }
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 700 000 00 00"
              />
            </Field>
          </div>
          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
          <Button className="mt-8" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Отправляем…" : "Записаться"}
          </Button>
        </>
      )}

      {screen === "success" && created && (
        <SuccessScreen
          booking={created}
          onHome={resetFlow}
          onMine={openMine}
        />
      )}

      {screen === "bookings" && (
        <MyBookingsScreen
          bookings={mine}
          error={error}
          onBack={goBackScreen}
          onHome={resetFlow}
        />
      )}
    </AppShell>
  );
}

function HomeScreen({
  isAdmin,
  categories,
  hiddenIds,
  onOpenCategory,
  onMine,
}: {
  isAdmin: boolean;
  categories: typeof CATEGORIES;
  hiddenIds: string[];
  onOpenCategory: (id: CategoryId) => void;
  onMine: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-3 lumi-enter">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-rose">
            студия красоты
          </p>
          <h1 className="mt-1 font-display text-5xl font-medium leading-none tracking-tight">
            Lumi
          </h1>
        </div>
        {isAdmin ? (
          <Link
            to="/admin"
            className="mt-1 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Админ
          </Link>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl shadow-card lumi-enter lumi-enter-2">
        <img
          src={STUDIO_IMAGE}
          alt="Интерьер студии Lumi"
          className="h-44 w-full object-cover"
        />
      </div>

      <p className="mt-5 text-base leading-relaxed text-muted lumi-enter lumi-enter-3">
        Студия красоты. Запись к мастеру за пару минут.
      </p>

      <div className="relative z-10 mt-6 flex flex-col gap-4">
        {categories.map((category, index) => {
          const from = startingPrice(category.id, hiddenIds);
          return (
            <button
              key={category.id}
              type="button"
              aria-label={category.name}
              onClick={() => onOpenCategory(category.id)}
              className={cn(
                "relative w-full cursor-pointer overflow-hidden rounded-xl bg-surface text-left shadow-card",
                "touch-manipulation transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.98]",
                "lumi-enter",
                index === 0 && "lumi-enter-3",
                index === 1 && "lumi-enter-4",
                index === 2 && "lumi-enter-5",
                index >= 3 && "lumi-enter-6",
              )}
            >
              <img
                src={category.image}
                alt=""
                draggable={false}
                className="pointer-events-none h-36 w-full select-none object-cover"
              />
              <span className="pointer-events-none flex items-end justify-between px-4 py-3">
                <span className="font-display text-2xl font-medium leading-none">
                  {category.name}
                </span>
                {from != null ? (
                  <span className="text-sm text-muted">
                    от {formatPrice(from)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <Button variant="secondary" className="mt-6" onClick={onMine}>
        <Calendar className="mr-2 size-4" />
        Мои записи
      </Button>
    </>
  );
}

function ScheduleScreen({
  serviceName,
  masterName,
  date,
  time,
  taken,
  error,
  onBack,
  onDate,
  onTime,
  onNext,
}: {
  serviceName: string;
  masterName: string;
  date: string;
  time: string;
  taken: string[];
  error: string;
  onBack: () => void;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
  onNext: () => void;
}) {
  const busy = useMemo(() => new Set(taken), [taken]);

  return (
    <>
      <ScreenHeader title="Дата и время" onBack={onBack} />
      <p className="mb-5 text-sm text-muted">
        {serviceName} · {masterName}
      </p>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
        {DAYS.map((iso) => {
          const selected = iso === date;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                onDate(iso);
                onTime("");
              }}
              className={cn(
                "flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-sm transition-colors duration-150",
                selected
                  ? "bg-rose text-on-rose"
                  : "bg-surface text-ink shadow-card",
              )}
            >
              <span className="text-xs uppercase text-current opacity-70">
                {weekdayShort(iso)}
              </span>
              <span className="text-base font-medium">{dayNumber(iso)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {TIME_SLOTS.map((slot) => {
          const disabled = busy.has(slot) || isSlotPast(date, slot);
          const selected = time === slot;
          return (
            <button
              key={slot}
              type="button"
              disabled={disabled}
              onClick={() => onTime(slot)}
              className={cn(
                "flex h-12 items-center justify-center rounded-2xl text-sm font-medium transition-colors duration-150",
                selected && "bg-rose text-on-rose",
                !selected && !disabled && "bg-surface text-ink shadow-card",
                disabled && "bg-surface-2 text-faint",
              )}
            >
              {slot}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <Button className="mt-8" disabled={!time} onClick={onNext}>
        Далее
      </Button>
    </>
  );
}

function SuccessScreen({
  booking,
  onHome,
  onMine,
}: {
  booking: BookingDto;
  onHome: () => void;
  onMine: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center pt-8 text-center lumi-enter">
        <span className="flex size-14 items-center justify-center rounded-full bg-rose-soft text-rose-deep">
          <Check className="size-6" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-medium leading-tight">
          Запись принята
        </h1>
        <p className="mt-2 max-w-xs text-base leading-relaxed text-muted">
          Мы напишем вам в Telegram.
        </p>
      </div>
      <div className="rounded-xl bg-surface p-5 text-left shadow-card lumi-enter lumi-enter-3">
        <Row label="Услуга" value={booking.serviceName} />
        <Row label="Мастер" value={booking.masterName} />
        <Row
          label="Дата и время"
          value={formatDateTime(booking.date, booking.time)}
        />
        <Row label="Цена" value={formatPrice(booking.price)} last />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={onHome}>На главную</Button>
        <Button variant="secondary" onClick={onMine}>
          Мои записи
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={cn("py-3", !last && "border-b border-line")}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function MyBookingsScreen({
  bookings,
  error,
  onBack,
  onHome,
}: {
  bookings: BookingDto[] | null;
  error: string;
  onBack: () => void;
  onHome: () => void;
}) {
  return (
    <>
      <ScreenHeader title="Мои записи" onBack={onBack} />
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {bookings === null ? (
        <p className="text-sm text-muted">Загружаем…</p>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 shadow-card">
          <p className="font-medium">Пока нет записей</p>
          <p className="mt-1 text-sm text-muted">
            Выберите направление на главной — запись займёт пару минут.
          </p>
          <Button className="mt-5" onClick={onHome}>
            К направлениям
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-xl bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{booking.serviceName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {booking.masterName} · {formatDateRu(booking.date)},{" "}
                    {booking.time}
                  </p>
                </div>
                <StatusPill status={booking.status} />
              </div>
              <p className="mt-3 text-sm">{formatPrice(booking.price)}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

