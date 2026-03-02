import type { FeatureCollection, Feature, Geometry } from "geojson"
import { createClient } from "@/lib/supabase/client"

export async function getFlightsGeoJSON(): Promise<
  FeatureCollection<Geometry>
> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema("flight")
    .from("flights_geojson")
    .select("*")

  if (error) throw error

  const features: Feature<Geometry>[] = data.map((row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
      id: row.id,
      flight_number: row.flight_number,
      airline_name: row.airline_name,
      departure_time: row.departure_time,
      arrival_time: row.arrival_time,
      route_frequency: row.route_frequency,
      ...row.properties,
    },
  }))

  return {
    type: "FeatureCollection",
    features,
  }
}