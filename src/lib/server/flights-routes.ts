import { supabaseAdmin } from "@/lib/supabase/admin"
import { cacheLife, cacheTag } from "next/cache"
import type { FeatureCollection, Feature, LineString } from "geojson"

export interface RoutesGeoJSONProperties {
  id: string
  airport_a_id: string
  airport_b_id: string
  airport_a_iata: string
  airport_b_iata: string
  airport_a_name: string
  airport_b_name: string
  airport_a_city: string | null
  airport_b_city: string | null
  airport_a_country: string | null
  airport_b_country: string | null
  route_frequency: number
  flights_by_direction: Record<
    string,
    Record<string, string[]>
  > | null
  distance_km: number | null
}

type RoutesFeatureCollection = FeatureCollection<
  LineString,
  RoutesGeoJSONProperties
>

export async function getRoutesGeoJSON() {
  "use cache"
  cacheTag("flights")
  cacheLife("days")

  const db = supabaseAdmin as any
  const { data, error } = await db
    .schema("flight")
    .from("routes_geojson")
    .select("*")

  if (error) throw new Error(error.message)

  const features: Feature<LineString, RoutesGeoJSONProperties>[] =
    (data ?? []).map((row: any) => ({
      type: "Feature" as const,
      geometry: row.geometry,
      properties: {
        id: row.id,
        airport_a_id: row.airport_a_id,
        airport_b_id: row.airport_b_id,
        airport_a_iata: row.airport_a_iata,
        airport_b_iata: row.airport_b_iata,
        airport_a_name: row.airport_a_name,
        airport_b_name: row.airport_b_name,
        airport_a_city: row.airport_a_city,
        airport_b_city: row.airport_b_city,
        airport_a_country: row.airport_a_country,
        airport_b_country: row.airport_b_country,
        route_frequency: row.route_frequency,
        flights_by_direction:
          row.flights_by_direction as Record<
            string,
            Record<string, string[]>
          > | null,
        distance_km: row.distance_km,
      },
    }))

  return {
    type: "FeatureCollection" as const,
    features,
  } as RoutesFeatureCollection
}
