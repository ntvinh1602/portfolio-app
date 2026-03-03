create view flight.flights_readable with (security_invoker = on) as
select
  f.flight_number,
  f.tail_number,
  f.departure_time,
  f.arrival_time,
  dep.iata_code as depature_airport,
  arr.iata_code as arrival_airport,
  al.name as airline_name,
  ac.model as aircraft_model,
  f.seat,
  f.seat_type,
  f.seat_position
from
  flight.flights f
  left join flight.airlines al on al.id = f.airline_id
  left join flight.aircrafts ac on ac.id = f.aircraft_id
  left join flight.airports dep on dep.id = f.departure_airport_id
  left join flight.airports arr on arr.id = f.arrival_airport_id
order by f.departure_time desc