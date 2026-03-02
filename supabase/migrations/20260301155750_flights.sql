CREATE SCHEMA IF NOT EXISTS flight;
GRANT USAGE ON SCHEMA flight TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA flight TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA flight TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA flight TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA flight GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA flight GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA flight GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

create table flight.airports (
  id uuid primary key default gen_random_uuid(),
  iata_code text unique not null,
  icao_code text,
  name text not null,
  city text,
  country text,
  lat double precision not null,
  lng double precision not null,
  geom extensions.geography(Point, 4326) not null
);

create index airports_geom_idx on flight.airports using gist (geom);