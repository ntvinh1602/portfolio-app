create table flight.airlines (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table flight.aircrafts (
  id uuid primary key default gen_random_uuid(),
  icao_code text unique not null,
  model text null
);