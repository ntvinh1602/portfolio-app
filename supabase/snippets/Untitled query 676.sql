
declare
  dep_tz text;
  arr_tz text;
  dep_utc timestamptz;
  arr_utc timestamptz;
begin
  select timezone into dep_tz
  from airports
  where id = p_departure_airport_id;

  select timezone into arr_tz
  from airports
  where id = p_arrival_airport_id;

  -- Convert local timestamp (without tz) into UTC
  dep_utc := (p_departure_local::timestamp at time zone dep_tz);
  arr_utc := (p_arrival_local::timestamp at time zone arr_tz);

  insert into flights (
    user_id,
    departure_airport_id,
    departure_time,
    arrival_airport_id,
    arrival_time,
    flight_number,
    airline_id,
    ticket_class,
    seat_number,
    seat_position,
    aircraft_id,
    tail_number,
    notes
  )
  values (
    auth.uid(),
    p_departure_airport_id,
    dep_utc,
    p_arrival_airport_id,
    arr_utc,
    p_flight_number,
    p_airline_id,
    p_ticket_class,
    coalesce(p_seat_no),
    p_seat_pos,
    p_aircraft_id,
    p_tail_no,
    p_notes
  );
end;
