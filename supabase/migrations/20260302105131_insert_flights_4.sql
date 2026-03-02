create or replace function flight.compute_flight_geometry()
returns trigger as $$
declare
  dep extensions.geography(Point, 4326);
  arr extensions.geography(Point, 4326);
begin
  select geom into dep from flight.airports where id = new.departure_airport_id;
  select geom into arr from flight.airports where id = new.arrival_airport_id;

  -- create straight great-circle line
  new.route := extensions.ST_MakeLine(dep::extensions.geometry, arr::extensions.geometry)::extensions.geography;

  -- compute distance
  new.distance_km := extensions.ST_Distance(dep, arr) / 1000;

  return new;
end;
$$ language plpgsql;