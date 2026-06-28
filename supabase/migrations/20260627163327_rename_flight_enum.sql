create type "flight"."seat_position" as enum ('window', 'middle', 'aisle');

create type "flight"."seat_type" as enum ('eco', 'biz');

drop view if exists "flight"."lifetime_stats";

drop view if exists "flight"."flights_readable";

drop view if exists "flight"."routes_geojson";

alter table "flight"."flights" alter column "seat_position" set data type flight.seat_position using "seat_position"::text::flight.seat_position;

alter table "flight"."flights" alter column "seat_type" set data type flight.seat_type using "seat_type"::text::flight.seat_type;

drop type "flight"."seat_position_enum";

drop type "flight"."seat_type_enum";

set check_function_bodies = off;

create or replace view "flight"."routes_geojson" WITH ("security_invoker"='on') as  WITH normalized AS (
         SELECT LEAST(f.departure_airport_id, f.arrival_airport_id) AS airport_a_id,
            GREATEST(f.departure_airport_id, f.arrival_airport_id) AS airport_b_id,
            f.departure_airport_id,
            f.arrival_airport_id,
            f.flight_number,
            al.name AS airline_name
           FROM (flight.flights f
             LEFT JOIN flight.airlines al ON ((al.id = f.airline_id)))
        ), route_frequency_cte AS (
         SELECT normalized.airport_a_id,
            normalized.airport_b_id,
            count(*) AS route_frequency
           FROM normalized
          GROUP BY normalized.airport_a_id, normalized.airport_b_id
        ), direction_airline_grouped AS (
         SELECT n.airport_a_id,
            n.airport_b_id,
                CASE
                    WHEN (n.departure_airport_id = n.airport_a_id) THEN ((a_1.iata_code || ' → '::text) || b_1.iata_code)
                    ELSE ((b_1.iata_code || ' → '::text) || a_1.iata_code)
                END AS direction_label,
            n.airline_name,
            array_agg(DISTINCT n.flight_number ORDER BY n.flight_number) FILTER (WHERE (n.flight_number IS NOT NULL)) AS flight_numbers
           FROM ((normalized n
             JOIN flight.airports a_1 ON ((a_1.id = n.airport_a_id)))
             JOIN flight.airports b_1 ON ((b_1.id = n.airport_b_id)))
          GROUP BY n.airport_a_id, n.airport_b_id,
                CASE
                    WHEN (n.departure_airport_id = n.airport_a_id) THEN ((a_1.iata_code || ' → '::text) || b_1.iata_code)
                    ELSE ((b_1.iata_code || ' → '::text) || a_1.iata_code)
                END, n.airline_name
        ), direction_grouped AS (
         SELECT direction_airline_grouped.airport_a_id,
            direction_airline_grouped.airport_b_id,
            direction_airline_grouped.direction_label,
            jsonb_object_agg(direction_airline_grouped.airline_name, direction_airline_grouped.flight_numbers) AS airlines
           FROM direction_airline_grouped
          WHERE (direction_airline_grouped.airline_name IS NOT NULL)
          GROUP BY direction_airline_grouped.airport_a_id, direction_airline_grouped.airport_b_id, direction_airline_grouped.direction_label
        ), flights_json AS (
         SELECT direction_grouped.airport_a_id,
            direction_grouped.airport_b_id,
            jsonb_object_agg(direction_grouped.direction_label, direction_grouped.airlines) AS flights_by_direction
           FROM direction_grouped
          GROUP BY direction_grouped.airport_a_id, direction_grouped.airport_b_id
        )
 SELECT gen_random_uuid() AS id,
    a.id AS airport_a_id,
    b.id AS airport_b_id,
    a.iata_code AS airport_a_iata,
    b.iata_code AS airport_b_iata,
    a.name AS airport_a_name,
    b.name AS airport_b_name,
    a.city AS airport_a_city,
    b.city AS airport_b_city,
    a.country AS airport_a_country,
    b.country AS airport_b_country,
    rf.route_frequency,
    fj.flights_by_direction,
    round(((extensions.st_distance(a.geom, b.geom))::numeric / (1000)::numeric), 1) AS distance_km,
    (extensions.st_asgeojson(extensions.st_makeline((a.geom)::extensions.geometry, (b.geom)::extensions.geometry)))::json AS geometry
   FROM (((route_frequency_cte rf
     JOIN flights_json fj ON (((fj.airport_a_id = rf.airport_a_id) AND (fj.airport_b_id = rf.airport_b_id))))
     JOIN flight.airports a ON ((a.id = rf.airport_a_id)))
     JOIN flight.airports b ON ((b.id = rf.airport_b_id)));


CREATE OR REPLACE FUNCTION public.rebuild_ledger()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$declare
    tx record;
begin
    raise notice 'Rebuilding ledger (positions + legs)...';

    -- Step 1: clear all derived data
    truncate table public.tx_legs cascade;
    truncate table public.asset_positions cascade;

    -- Step 2: replay all transactions in chronological order
    for tx in
        select id, category, created_at
        from public.tx_entries
        order by created_at asc
    loop
        if tx.category = 'stock' then
            perform public.process_tx_stock(tx.id);

        elsif tx.category = 'cashflow' then
            perform public.process_tx_cashflow(tx.id);

        elsif tx.category = 'debt' then
            perform public.process_tx_debt(tx.id);

        else
            raise notice 'Skipping unknown category % for id %', tx.category, tx.id;
        end if;
    end loop;

    raise notice 'Ledger rebuild completed.';
end;$function$
;

create or replace view "flight"."flights_readable" WITH ("security_invoker"='on') as  SELECT f.user_id,
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


create or replace view "flight"."lifetime_stats" WITH ("security_invoker"='on') as  WITH visited_airports AS (
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



