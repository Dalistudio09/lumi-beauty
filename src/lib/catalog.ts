export const TIME_SLOTS = ["11:00", "13:00", "15:00", "17:00", "19:00"] as const;

export type CategoryId =
  | "manicure"
  | "pedicure"
  | "brows"
  | "lashes"
  | "sugaring";

export type Category = {
  id: CategoryId;
  name: string;
  image: string;
};

export type Service = {
  id: string;
  categoryId: CategoryId;
  name: string;
  price: number;
  durationMin: number;
};

export type Master = {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  photo: string;
  categoryIds: CategoryId[];
};

export const CATEGORIES: Category[] = [
  { id: "manicure", name: "Маникюр", image: "/images/manicure.jpg" },
  { id: "pedicure", name: "Педикюр", image: "/images/pedicure.jpg" },
  { id: "brows", name: "Брови", image: "/images/brows.jpg" },
  { id: "lashes", name: "Ресницы", image: "/images/lashes.jpg" },
  { id: "sugaring", name: "Шугаринг", image: "/images/sugaring.jpg" },
];

export const SERVICES: Service[] = [
  {
    id: "manicure-bare",
    categoryId: "manicure",
    name: "Маникюр без покрытия",
    price: 6000,
    durationMin: 45,
  },
  {
    id: "manicure-combo",
    categoryId: "manicure",
    name: "Комбинированный маникюр + гель",
    price: 9000,
    durationMin: 75,
  },
  {
    id: "manicure-strengthen",
    categoryId: "manicure",
    name: "Укрепление + покрытие",
    price: 11000,
    durationMin: 90,
  },
  {
    id: "pedicure-bare",
    categoryId: "pedicure",
    name: "Педикюр без покрытия",
    price: 8000,
    durationMin: 60,
  },
  {
    id: "pedicure-cover",
    categoryId: "pedicure",
    name: "Педикюр + покрытие",
    price: 12000,
    durationMin: 80,
  },
  {
    id: "pedicure-smart",
    categoryId: "pedicure",
    name: "Смарт-педикюр + покрытие",
    price: 14000,
    durationMin: 90,
  },
  {
    id: "brows-shape",
    categoryId: "brows",
    name: "Коррекция бровей",
    price: 4000,
    durationMin: 30,
  },
  {
    id: "brows-tint",
    categoryId: "brows",
    name: "Коррекция + окрашивание",
    price: 6000,
    durationMin: 45,
  },
  {
    id: "brows-lamination",
    categoryId: "brows",
    name: "Ламинирование бровей",
    price: 9000,
    durationMin: 60,
  },
  {
    id: "lashes-lamination",
    categoryId: "lashes",
    name: "Ламинирование ресниц",
    price: 8000,
    durationMin: 60,
  },
  {
    id: "lashes-classic",
    categoryId: "lashes",
    name: "Наращивание классика",
    price: 10000,
    durationMin: 120,
  },
  {
    id: "lashes-volume",
    categoryId: "lashes",
    name: "Наращивание 2D/3D",
    price: 13000,
    durationMin: 150,
  },
  {
    id: "sugar-underarms",
    categoryId: "sugaring",
    name: "Подмышки",
    price: 3000,
    durationMin: 20,
  },
  {
    id: "sugar-legs",
    categoryId: "sugaring",
    name: "Ноги до колен",
    price: 6000,
    durationMin: 40,
  },
  {
    id: "sugar-complex",
    categoryId: "sugaring",
    name: "Комплекс «бикини + подмышки»",
    price: 9000,
    durationMin: 50,
  },
];

export const MASTERS: Master[] = [
  {
    id: "alina",
    name: "Алина",
    specialty: "Маникюр и педикюр",
    experience: "опыт 6 лет",
    photo: "/images/alina.jpg",
    categoryIds: ["manicure", "pedicure"],
  },
  {
    id: "maria",
    name: "Мария",
    specialty: "Маникюр",
    experience: "опыт 4 года",
    photo: "/images/maria.jpg",
    categoryIds: ["manicure"],
  },
  {
    id: "darina",
    name: "Дарина",
    specialty: "Педикюр",
    experience: "опыт 5 лет",
    photo: "/images/darina.jpg",
    categoryIds: ["pedicure"],
  },
  {
    id: "kamila",
    name: "Камила",
    specialty: "Брови",
    experience: "опыт 4 года",
    photo: "/images/kamila.jpg",
    categoryIds: ["brows"],
  },
  {
    id: "aigerim",
    name: "Айгерим",
    specialty: "Брови",
    experience: "опыт 3 года",
    photo: "/images/aigerim.jpg",
    categoryIds: ["brows"],
  },
  {
    id: "dania",
    name: "Дания",
    specialty: "Ресницы",
    experience: "опыт 5 лет",
    photo: "/images/dania.jpg",
    categoryIds: ["lashes"],
  },
  {
    id: "anel",
    name: "Анель",
    specialty: "Ресницы",
    experience: "опыт 4 года",
    photo: "/images/anel.jpg",
    categoryIds: ["lashes"],
  },
  {
    id: "sabina",
    name: "Сабина",
    specialty: "Шугаринг",
    experience: "опыт 3 года",
    photo: "/images/sabina.jpg",
    categoryIds: ["sugaring"],
  },
  {
    id: "zhanna",
    name: "Жанна",
    specialty: "Шугаринг",
    experience: "опыт 6 лет",
    photo: "/images/zhanna.jpg",
    categoryIds: ["sugaring"],
  },
];

export const STUDIO_IMAGE = "/images/studio.jpg";

export function getCategory(id: string) {
  return CATEGORIES.find((item) => item.id === id);
}

export function getService(id: string) {
  return SERVICES.find((item) => item.id === id);
}

export function getMaster(id: string) {
  return MASTERS.find((item) => item.id === id);
}

export function servicesForCategory(categoryId: string, hiddenIds: string[]) {
  const hidden = new Set(hiddenIds);
  return SERVICES.filter(
    (item) => item.categoryId === categoryId && !hidden.has(item.id),
  );
}

export function mastersForService(serviceId: string) {
  const service = getService(serviceId);
  if (!service) return [];
  return MASTERS.filter((master) =>
    master.categoryIds.includes(service.categoryId),
  );
}

export function startingPrice(categoryId: string, hiddenIds: string[]) {
  const list = servicesForCategory(categoryId, hiddenIds);
  if (list.length === 0) return null;
  return Math.min(...list.map((item) => item.price));
}

export const BOOKING_STATUSES = [
  { id: "new", label: "новая" },
  { id: "confirmed", label: "подтверждена" },
  { id: "done", label: "проведена" },
  { id: "cancelled", label: "отменена" },
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number]["id"];

export function statusLabel(status: string) {
  return BOOKING_STATUSES.find((item) => item.id === status)?.label ?? status;
}
