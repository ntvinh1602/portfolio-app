drop view if exists flight.flights_geojson;

create or replace view flight.flights_geojson as
select
  f.id,
  f.flight_number,
  f.departure_time,
  f.arrival_time,
  f.distance_km,

  al.name as airline_name,

  ac.model as aircraft_model,
  ac.icao_code as aircraft_icao_code,

  dep.country as departure_country,
  arr.country as arrival_country,

  extensions.st_asgeojson(f.route)::json as geometry,

  count(*) over (
    partition by
      f.departure_airport_id,
      f.arrival_airport_id
  ) as route_frequency,

  json_build_object(
    'departure_airport_id', f.departure_airport_id,
    'arrival_airport_id', f.arrival_airport_id,
    'seat', f.seat,
    'seat_type', f.seat_type,
    'seat_position', f.seat_position,
    'tail_number', f.tail_number
  ) as properties

from flight.flights f
left join flight.airlines al on al.id = f.airline_id
left join flight.aircrafts ac on ac.id = f.aircraft_id
left join flight.airports dep on dep.id = f.departure_airport_id
left join flight.airports arr on arr.id = f.arrival_airport_id
where f.route is not null;