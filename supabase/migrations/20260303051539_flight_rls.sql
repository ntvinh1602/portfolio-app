ALTER TABLE "flight"."aircrafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flight"."airlines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flight"."airports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flight"."flights" ENABLE ROW LEVEL SECURITY;

drop view if exists flight.flights_geojson;
create or replace view flight.flights_geojson with (security_invoker = on) as
select
  f.id,
  f.flight_number,
  f.departure_time,
  f.arrival_time,
  al.name as airline_name,

  -- convert geography -> geojson
  extensions.st_asgeojson(f.route)::json as geometry,
  count(*) over (
    partition by f.departure_airport_id, f.arrival_airport_id
  ) as route_frequency,

  json_build_object(
    'departure_airport_id', f.departure_airport_id,
    'arrival_airport_id', f.arrival_airport_id,
    'seat', f.seat,
    'seat_type', f.seat_type,
    'tail_number', f.tail_number
  ) as properties

from flight.flights f
left join flight.airlines al on al.id = f.airline_id
where f.route is not null;