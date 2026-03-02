drop index if exists flight.airports_geom_idx;

alter table flight.airports
drop column geom;

alter table flight.airports
add column geom extensions.geography(Point, 4326)
generated always as (
  extensions.ST_SetSRID(
    extensions.ST_MakePoint(lng, lat),
    4326
  )::extensions.geography
) stored;

create index airports_geom_idx
on flight.airports
using gist (geom);