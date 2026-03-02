drop view if exists flight.flights_geojson;
ALTER TABLE flight.flights DROP COLUMN user_id;
create view flight.flights_geojson as
select
  id,
  airline,
  flight_number,
  distance_km,
  extensions.ST_AsGeoJSON(route)::json as geometry
from flight.flights;


