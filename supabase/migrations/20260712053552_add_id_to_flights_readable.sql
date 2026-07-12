DROP VIEW IF EXISTS "flight"."lifetime_stats" CASCADE;
DROP VIEW IF EXISTS "flight"."flights_readable" CASCADE;

CREATE OR REPLACE VIEW "flight"."flights_readable" WITH ("security_invoker"='on') AS
 SELECT "f"."user_id",
    "f"."id",
    "f"."flight_number",
    "f"."tail_number",
    "f"."departure_time",
    "f"."arrival_time",
    "f"."seat",
    "f"."seat_type",
    "f"."seat_position",
    "dep"."iata_code" AS "departure_airport_code",
    "arr"."iata_code" AS "arrival_airport_code",
    "dep"."name" AS "departure_airport_name",
    "arr"."name" AS "arrival_airport_name",
    "al"."name" AS "airline_name",
    "al"."logo" AS "airline_logo",
    "ac"."model" AS "aircraft_model",
    "r"."distance_km",
    "concat"("floor"((EXTRACT(epoch FROM ("f"."arrival_time" - "f"."departure_time")) / (3600)::numeric)), 'h ', "floor"(((EXTRACT(epoch FROM ("f"."arrival_time" - "f"."departure_time")) % (3600)::numeric) / (60)::numeric)), 'm') AS "duration"
   FROM ((((("flight"."flights" "f"
     LEFT JOIN "flight"."airlines" "al" ON (("al"."id" = "f"."airline_id")))
     LEFT JOIN "flight"."aircrafts" "ac" ON (("ac"."id" = "f"."aircraft_id")))
     LEFT JOIN "flight"."airports" "dep" ON (("dep"."id" = "f"."departure_airport_id")))
     LEFT JOIN "flight"."airports" "arr" ON (("arr"."id" = "f"."arrival_airport_id")))
     LEFT JOIN "flight"."routes_geojson" "r" ON ((("r"."airport_a_id" = LEAST("f"."departure_airport_id", "f"."arrival_airport_id")) AND ("r"."airport_b_id" = GREATEST("f"."departure_airport_id", "f"."arrival_airport_id")))))
  ORDER BY "f"."departure_time" DESC;

ALTER VIEW "flight"."flights_readable" OWNER TO "postgres";

CREATE OR REPLACE VIEW "flight"."lifetime_stats" WITH ("security_invoker"='on') AS
 WITH "visited_airports" AS (
         SELECT "flights"."user_id",
            "flights"."departure_airport_id" AS "airport_id"
           FROM "flight"."flights"
        UNION
         SELECT "flights"."user_id",
            "flights"."arrival_airport_id"
           FROM "flight"."flights"
        )
 SELECT "f"."user_id",
    "f"."flights_count",
    "count"(DISTINCT "va"."airport_id") AS "airports_count",
    "count"(DISTINCT "a"."country") AS "country_count",
    "f"."airframe_count",
    "f"."total_distance",
    "f"."total_duration"
   FROM ((( SELECT "flights_readable"."user_id",
            "count"(*) AS "flights_count",
            "count"(DISTINCT "flights_readable"."aircraft_model") AS "airframe_count",
            "sum"("flights_readable"."distance_km") AS "total_distance",
            ("round"((EXTRACT(epoch FROM "sum"(("flights_readable"."arrival_time" - "flights_readable"."departure_time"))) / (3600)::numeric), 1) || ' hours'::"text") AS "total_duration"
           FROM "flight"."flights_readable"
          GROUP BY "flights_readable"."user_id") "f"
     LEFT JOIN "visited_airports" "va" ON (("va"."user_id" = "f"."user_id")))
     LEFT JOIN "flight"."airports" "a" ON (("a"."id" = "va"."airport_id")))
  GROUP BY "f"."user_id", "f"."flights_count", "f"."airframe_count", "f"."total_distance", "f"."total_duration";

ALTER VIEW "flight"."lifetime_stats" OWNER TO "postgres";
