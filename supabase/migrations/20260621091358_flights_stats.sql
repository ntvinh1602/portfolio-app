create or replace view flight.lifetime_stats with (security_invoker = on) as
SELECT
  f.flights_count,
  a.airports_count,
  c.country_count,
  f.airframe_count,
  f.total_distance,
  f.total_duration
FROM (
  SELECT
    COUNT(*) AS flights_count,
    COUNT(DISTINCT aircraft_id) AS airframe_count,
    (SELECT SUM(distance_km) FROM flight.flights_readable) AS total_distance,
    ROUND(EXTRACT(EPOCH FROM SUM(arrival_time - departure_time)) / 3600, 1) || ' hours' AS total_duration
  FROM flight.flights
) f
CROSS JOIN (
  SELECT COUNT(DISTINCT airport_id) AS airports_count
  FROM (
    SELECT departure_airport_id AS airport_id FROM flight.flights
    UNION ALL
    SELECT arrival_airport_id FROM flight.flights
  ) airports
) a
CROSS JOIN (
  SELECT COUNT(DISTINCT a.country) AS country_count
  FROM flight.flights f
  JOIN flight.airports a ON a.id IN (f.departure_airport_id, f.arrival_airport_id)
) c;

