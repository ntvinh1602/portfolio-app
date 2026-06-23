drop policy "Auth users can read flights" on "flight"."flights";

drop view if exists "flight"."lifetime_stats";

drop view if exists "flight"."flights_readable";

alter table "flight"."airports" alter column "city" set not null;

alter table "flight"."airports" alter column "country" set not null;

alter table "flight"."flights" add column "user_id" uuid;

alter table "flight"."flights" add constraint "flights_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "flight"."flights" validate constraint "flights_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

create or replace view "flight"."flights_readable" as  SELECT f.user_id,
    f.flight_number,
    f.tail_number,
    f.departure_time,
    f.arrival_time,
    dep.iata_code AS departure_airport_code,
    arr.iata_code AS arrival_airport_code,
    dep.name AS departure_airport_name,
    arr.name AS arrival_airport_name,
    al.name AS airline_name,
    al.logo AS airline_logo,
    ac.model AS aircraft_model,
    f.seat,
    f.seat_type,
    f.seat_position,
    r.distance_km,
    concat(floor((EXTRACT(epoch FROM (f.arrival_time - f.departure_time)) / (3600)::numeric)), 'h ', floor(((EXTRACT(epoch FROM (f.arrival_time - f.departure_time)) % (3600)::numeric) / (60)::numeric)), 'm') AS duration
   FROM (((((flight.flights f
     LEFT JOIN flight.airlines al ON ((al.id = f.airline_id)))
     LEFT JOIN flight.aircrafts ac ON ((ac.id = f.aircraft_id)))
     LEFT JOIN flight.airports dep ON ((dep.id = f.departure_airport_id)))
     LEFT JOIN flight.airports arr ON ((arr.id = f.arrival_airport_id)))
     LEFT JOIN flight.routes_geojson r ON (((r.airport_a_id = LEAST(f.departure_airport_id, f.arrival_airport_id)) AND (r.airport_b_id = GREATEST(f.departure_airport_id, f.arrival_airport_id)))))
  ORDER BY f.departure_time DESC;


CREATE OR REPLACE FUNCTION flight.insert_flight_with_timezone(p_flight_number text, p_airline_id uuid, p_aircraft_id uuid, p_departure_airport_id uuid, p_arrival_airport_id uuid, p_departure_local text, p_arrival_local text)
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
    flight_number,
    airline_id,
    aircraft_id,
    departure_airport_id,
    arrival_airport_id,
    departure_time,
    arrival_time
  )
  values (
    auth.uid(),
    p_flight_number,
    p_airline_id,
    p_aircraft_id,
    p_departure_airport_id,
    p_arrival_airport_id,
    dep_utc,
    arr_utc
  );
end;
$function$
;

create or replace view "flight"."lifetime_stats" as  WITH visited_airports AS (
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
            count(DISTINCT flights_readable.aircraft_model) AS airframe_count,
            sum(flights_readable.distance_km) AS total_distance,
            (round((EXTRACT(epoch FROM sum((flights_readable.arrival_time - flights_readable.departure_time))) / (3600)::numeric), 1) || ' hours'::text) AS total_duration
           FROM flight.flights_readable
          GROUP BY flights_readable.user_id) f
     LEFT JOIN visited_airports va ON ((va.user_id = f.user_id)))
     LEFT JOIN flight.airports a ON ((a.id = va.airport_id)))
  GROUP BY f.user_id, f.flights_count, f.airframe_count, f.total_distance, f.total_duration;


grant delete on table "flight"."aircrafts" to "anon";

grant insert on table "flight"."aircrafts" to "anon";

grant references on table "flight"."aircrafts" to "anon";

grant select on table "flight"."aircrafts" to "anon";

grant trigger on table "flight"."aircrafts" to "anon";

grant truncate on table "flight"."aircrafts" to "anon";

grant update on table "flight"."aircrafts" to "anon";

grant delete on table "flight"."airlines" to "anon";

grant insert on table "flight"."airlines" to "anon";

grant references on table "flight"."airlines" to "anon";

grant select on table "flight"."airlines" to "anon";

grant trigger on table "flight"."airlines" to "anon";

grant truncate on table "flight"."airlines" to "anon";

grant update on table "flight"."airlines" to "anon";

grant delete on table "flight"."airports" to "anon";

grant insert on table "flight"."airports" to "anon";

grant references on table "flight"."airports" to "anon";

grant select on table "flight"."airports" to "anon";

grant trigger on table "flight"."airports" to "anon";

grant truncate on table "flight"."airports" to "anon";

grant update on table "flight"."airports" to "anon";

grant delete on table "flight"."flights" to "anon";

grant insert on table "flight"."flights" to "anon";

grant references on table "flight"."flights" to "anon";

grant select on table "flight"."flights" to "anon";

grant trigger on table "flight"."flights" to "anon";

grant truncate on table "flight"."flights" to "anon";

grant update on table "flight"."flights" to "anon";

grant delete on table "public"."asset_positions" to "anon";

grant insert on table "public"."asset_positions" to "anon";

grant references on table "public"."asset_positions" to "anon";

grant select on table "public"."asset_positions" to "anon";

grant trigger on table "public"."asset_positions" to "anon";

grant truncate on table "public"."asset_positions" to "anon";

grant update on table "public"."asset_positions" to "anon";

grant delete on table "public"."assets" to "anon";

grant insert on table "public"."assets" to "anon";

grant references on table "public"."assets" to "anon";

grant select on table "public"."assets" to "anon";

grant trigger on table "public"."assets" to "anon";

grant truncate on table "public"."assets" to "anon";

grant update on table "public"."assets" to "anon";


  create policy "Enable insert for authenticated users only"
  on "flight"."flights"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable users to delete their own data only"
  on "flight"."flights"
  as permissive
  for delete
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Enable users to view their own data only"
  on "flight"."flights"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));



