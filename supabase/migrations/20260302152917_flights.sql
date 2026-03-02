
drop view if exists flight.flights_geojson;

ALTER TABLE flight.flights
ALTER COLUMN airline_id TYPE uuid USING airline_id::uuid,
ALTER COLUMN aircraft_id TYPE uuid USING aircraft_id::uuid;

CREATE TYPE flight.seat_type_enum AS ENUM (
  'economy',
  'premium_economy',
  'business'
);

CREATE TYPE flight.seat_position_enum AS ENUM (
  'window',
  'middle',
  'aisle'
);

ALTER TABLE flight.flights
ADD COLUMN seat_type flight.seat_type_enum,
ADD COLUMN seat_position flight.seat_position_enum;

ALTER TABLE flight.flights
ADD CONSTRAINT flights_airlines_id_fkey
FOREIGN KEY (airline_id) REFERENCES flight.airlines(id);

ALTER TABLE flight.flights
ADD CONSTRAINT flights_aircrafts_id_fkey
FOREIGN KEY (aircraft_id) REFERENCES flight.aircrafts(id);
