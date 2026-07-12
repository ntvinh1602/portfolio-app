SET check_function_bodies = false;
DROP FUNCTION flight.insert_flight_with_timezone(p_flight_number text, p_airline_id uuid, p_aircraft_id uuid, p_departure_airport_id uuid, p_arrival_airport_id uuid, p_departure_local text, p_arrival_local text);
DROP INDEX flight.flights_aircraft_id_idx;
DROP INDEX flight.flights_airline_id_idx;
DROP INDEX flight.flights_arrival_airport_id_idx;
DROP INDEX flight.flights_departure_airport_id_idx;
DROP INDEX flight.flights_departure_time_idx;
DROP VIEW flight.lifetime_stats;
DROP VIEW flight.flights_readable;
CREATE TYPE flight.ticket_class AS ENUM ('eco', 'biz');
CREATE FUNCTION flight.insert_flight_with_timezone(p_departure_airport_id uuid, p_departure_local text, p_arrival_airport_id uuid, p_arrival_local text, p_flight_number text, p_airline_id uuid, p_ticket_class flight.ticket_class, p_seat_no text DEFAULT NULL::text, p_seat_pos flight.seat_position DEFAULT NULL::flight.seat_position, p_aircraft_id uuid DEFAULT NULL::uuid, p_tail_no text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'flight'
AS $function$
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
    p_seat_no,
    p_seat_pos,
    p_aircraft_id,
    p_tail_no,
    p_notes
  );
end;
$function$;
GRANT ALL ON FUNCTION flight.insert_flight_with_timezone(uuid, text, uuid, text, text, uuid, flight.ticket_class, text, flight.seat_position, uuid, text, text) TO anon;
GRANT ALL ON FUNCTION flight.insert_flight_with_timezone(uuid, text, uuid, text, text, uuid, flight.ticket_class, text, flight.seat_position, uuid, text, text) TO authenticated;
GRANT ALL ON FUNCTION flight.insert_flight_with_timezone(uuid, text, uuid, text, text, uuid, flight.ticket_class, text, flight.seat_position, uuid, text, text) TO service_role;
ALTER TABLE flight.flights rename COLUMN seat to seat_number;
ALTER TABLE flight.flights rename COLUMN seat_type to ticket_class;
ALTER TABLE flight.flights
ALTER COLUMN ticket_class
TYPE flight.ticket_class
USING ticket_class::text::flight.ticket_class;
CREATE POLICY "Enable update for users based on user_id" ON flight.flights FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE VIEW flight.flights_readable WITH (security_invoker=on) AS SELECT f.user_id,
    f.id,
    f.flight_number,
    f.tail_number,
    f.departure_time,
    f.arrival_time,
    f.seat_number,
    f.ticket_class,
    f.seat_position,
    dep.iata_code AS departure_airport_code,
    arr.iata_code AS arrival_airport_code,
    dep.name AS departure_airport_name,
    arr.name AS arrival_airport_name,
    al.name AS airline_name,
    al.logo AS airline_logo,
    ac.model AS aircraft_type,
    r.distance_km,
    concat(floor((EXTRACT(epoch FROM (f.arrival_time - f.departure_time)) / (3600)::numeric)), 'h ', floor(((EXTRACT(epoch FROM (f.arrival_time - f.departure_time)) % (3600)::numeric) / (60)::numeric)), 'm') AS duration
   FROM (((((flight.flights f
     LEFT JOIN flight.airlines al ON ((al.id = f.airline_id)))
     LEFT JOIN flight.aircrafts ac ON ((ac.id = f.aircraft_id)))
     LEFT JOIN flight.airports dep ON ((dep.id = f.departure_airport_id)))
     LEFT JOIN flight.airports arr ON ((arr.id = f.arrival_airport_id)))
     LEFT JOIN flight.routes_geojson r ON (((r.airport_a_id = LEAST(f.departure_airport_id, f.arrival_airport_id)) AND (r.airport_b_id = GREATEST(f.departure_airport_id, f.arrival_airport_id)))))
  ORDER BY f.departure_time DESC;
CREATE OR REPLACE VIEW flight.lifetime_stats WITH (security_invoker=on) AS WITH visited_airports AS (
         SELECT flights.user_id,
            flights.departure_airport_id AS airport_id
           FROM flight.flights
        UNION
         SELECT flights.user_id,
            flights.arrival_airport_id
           FROM flight.flights
        )
 SELECT f.user_id,
    f.flights_count,
    count(DISTINCT va.airport_id) AS airports_count,
    count(DISTINCT a.country) AS country_count,
    f.airframe_count,
    f.total_distance,
    f.total_duration
   FROM ((( SELECT flights_readable.user_id,
            count(*) AS flights_count,
            count(DISTINCT flights_readable.aircraft_type) AS airframe_count,
            sum(flights_readable.distance_km) AS total_distance,
            (round((EXTRACT(epoch FROM sum((flights_readable.arrival_time - flights_readable.departure_time))) / (3600)::numeric), 1) || ' hours'::text) AS total_duration
           FROM flight.flights_readable
          GROUP BY flights_readable.user_id) f
     LEFT JOIN visited_airports va ON ((va.user_id = f.user_id)))
     LEFT JOIN flight.airports a ON ((a.id = va.airport_id)))
  GROUP BY f.user_id, f.flights_count, f.airframe_count, f.total_distance, f.total_duration;
