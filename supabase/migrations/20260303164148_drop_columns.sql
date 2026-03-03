drop view if exists flight.flights_geojson;
alter table flight.flights
drop column distance_km,
drop column route;

drop trigger if exists calc_flight_geometry_after_flights on flight.flights;
drop function if exists flight.compute_flight_geometry();