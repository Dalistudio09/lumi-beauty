create table if not exists hidden_services (
  service_id text primary key
);

create table if not exists bookings (
  id serial primary key,
  telegram_id text not null,
  client_name text not null,
  phone text not null,
  service_id text not null,
  service_name text not null,
  master_id text not null,
  master_name text not null,
  date text not null,
  time text not null,
  price integer not null,
  has_allergy boolean not null default false,
  allergy_note text not null default '',
  comment text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists bookings_telegram_id_idx on bookings (telegram_id);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_slot_idx on bookings (master_id, date, time);
