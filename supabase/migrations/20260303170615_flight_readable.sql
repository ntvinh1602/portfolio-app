drop view if exists flight.flights_readable;
create or replace view flight.flights_readable with (security_invoker = on) as
select
  f.flight_number,
  f.tail_number,
  f.departure_time,
  f.arrival_time,

  -- raw IDs (important for joins)
  f.departure_airport_id,
  f.arrival_airport_id,

  -- readable fields
  dep.iata_code as departure_airport,
  arr.iata_code as arrival_airport,
  dep.country as departure_country,
  arr.country as arrival_country,

  al.name as airline_name,
  ac.model as aircraft_model,

  f.seat,
  f.seat_type,
  f.seat_position,

  r.distance_km

from flight.flights f

left join flight.airlines al
  on al.id = f.airline_id

left join flight.aircrafts ac
  on ac.id = f.aircraft_id

left join flight.airports dep
  on dep.id = f.departure_airport_id

left join flight.airports arr
  on arr.id = f.arrival_airport_id

-- normalized join (no OR, no strings)
left join flight.routes_geojson r
  on r.airport_a_id = LEAST(f.departure_airport_id, f.arrival_airport_id)
 and r.airport_b_id = GREATEST(f.departure_airport_id, f.arrival_airport_id)

order by f.departure_time desc;