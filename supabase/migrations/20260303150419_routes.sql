create or replace view flight.routes_geojson with (security_invoker = on) as
with normalized as (
  select
    least(f.departure_airport_id, f.arrival_airport_id) as airport_a_id,
    greatest(f.departure_airport_id, f.arrival_airport_id) as airport_b_id,

    f.departure_airport_id,
    f.arrival_airport_id,
    f.flight_number,
    al.name as airline_name

  from flight.flights f
  left join flight.airlines al on al.id = f.airline_id
),

-- 1️⃣ True traffic volume
route_frequency_cte as (
  select
    airport_a_id,
    airport_b_id,
    count(*) as route_frequency
  from normalized
  group by airport_a_id, airport_b_id
),

-- 2️⃣ Direction + Airline grouping
direction_airline_grouped as (
  select
    n.airport_a_id,
    n.airport_b_id,

    case
      when n.departure_airport_id = n.airport_a_id
      then a.iata_code || ' → ' || b.iata_code
      else b.iata_code || ' → ' || a.iata_code
    end as direction_label,

    n.airline_name,

    array_agg(distinct n.flight_number order by n.flight_number)
      filter (where n.flight_number is not null) as flight_numbers

  from normalized n
  join flight.airports a on a.id = n.airport_a_id
  join flight.airports b on b.id = n.airport_b_id

  group by
    n.airport_a_id,
    n.airport_b_id,
    direction_label,
    n.airline_name
),

-- 3️⃣ Build airline object per direction
direction_grouped as (
  select
    airport_a_id,
    airport_b_id,
    direction_label,

    jsonb_object_agg(
      airline_name,
      flight_numbers
    ) as airlines

  from direction_airline_grouped
  where airline_name is not null
  group by airport_a_id, airport_b_id, direction_label
),

-- 4️⃣ Build final nested direction JSON
flights_json as (
  select
    airport_a_id,
    airport_b_id,
    jsonb_object_agg(direction_label, airlines)
      as flights_by_direction
  from direction_grouped
  group by airport_a_id, airport_b_id
)

select
  gen_random_uuid() as id,

  a.id as airport_a_id,
  b.id as airport_b_id,

  a.iata_code as airport_a_iata,
  b.iata_code as airport_b_iata,

  a.name as airport_a_name,
  b.name as airport_b_name,

  a.city as airport_a_city,
  b.city as airport_b_city,

  a.country as airport_a_country,
  b.country as airport_b_country,

  rf.route_frequency,
  fj.flights_by_direction,

  round(
    extensions.st_distance(a.geom, b.geom)::numeric / 1000,
    1
  ) as distance_km,

  extensions.st_asgeojson(
    extensions.st_makeline(
      a.geom::extensions.geometry,
      b.geom::extensions.geometry
    )
  )::json as geometry

from route_frequency_cte rf
join flights_json fj
  on fj.airport_a_id = rf.airport_a_id
 and fj.airport_b_id = rf.airport_b_id
join flight.airports a on a.id = rf.airport_a_id
join flight.airports b on b.id = rf.airport_b_id;