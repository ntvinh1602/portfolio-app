alter table flight.flights
drop column created_at;

ALTER TABLE flight.flights
ALTER COLUMN distance_km TYPE numeric(5,0) USING distance_km::numeric(5,0);