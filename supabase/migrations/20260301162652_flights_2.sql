create table flight.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  airline text,
  flight_number text,
  departure_airport_id uuid not null references flight.airports(id),
  arrival_airport_id uuid not null references flight.airports(id),
  departure_time timestamptz,
  arrival_time timestamptz,
  seat text,
  aircraft text,
  notes text,

  -- computed geo
  route extensions.geography(LineString, 4326),
  distance_km numeric,

  created_at timestamptz default now()
);

create index flights_user_idx on flight.flights(user_id);
create index flights_route_idx on flight.flights using gist(route);

create or replace function flight.compute_flight_geometry()
returns trigger as $$
declare
  dep extensions.geography(Point, 4326);
  arr extensions.geography(Point, 4326);
begin
  select geom into dep from flight.airports where id = new.departure_airport_id;
  select geom into arr from flight.airports where id = new.arrival_airport_id;

  -- create straight great-circle line
  new.route := ST_MakeLine(dep::geometry, arr::geometry)::extensions.geography;

  -- compute distance
  new.distance_km := ST_Distance(dep, arr) / 1000;

  return new;
end;
$$ language plpgsql;

create trigger calc_flight_geometry_after_flights
before insert or update on flight.flights
for each row
execute function flight.compute_flight_geometry();

create view flight.flights_geojson as
select
  id,
  user_id,
  airline,
  flight_number,
  distance_km,
  extensions.ST_AsGeoJSON(route)::json as geometry
from flight.flights;