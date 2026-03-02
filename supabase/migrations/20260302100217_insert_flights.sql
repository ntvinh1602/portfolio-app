create or replace function flight.insert_flight_with_timezone(
  p_flight_number text,
  p_airline_id uuid,
  p_aircraft_id uuid,
  p_departure_airport_id uuid,
  p_arrival_airport_id uuid,
  p_departure_local text,
  p_arrival_local text
)
returns void
language plpgsql security definer
SET "search_path" TO 'flight'
as $$
declare
  dep_tz text;
  arr_tz text;
  dep_utc timestamptz;
  arr_utc timestamptz;
begin
  select timezone into dep_tz
  from flight.airports
  where id = p_departure_airport_id;

  select timezone into arr_tz
  from flight.airports
  where id = p_arrival_airport_id;

  -- Convert local timestamp (without tz) into UTC
  dep_utc := (p_departure_local::timestamp at time zone dep_tz);
  arr_utc := (p_arrival_local::timestamp at time zone arr_tz);

  insert into flight.flights (
    flight_number,
    airline_id,
    aircraft_id,
    departure_airport_id,
    arrival_airport_id,
    departure_time,
    arrival_time
  )
  values (
    p_flight_number,
    p_airline_id,
    p_aircraft_id,
    p_departure_airport_id,
    p_arrival_airport_id,
    dep_utc,
    arr_utc
  );
end;
$$;