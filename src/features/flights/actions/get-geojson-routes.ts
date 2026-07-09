import { createClient } from "@/lib/supabase/server"
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
  airport_a_city: string
  airport_b_city: string
  airport_a_country: string
  airport_b_country: string
  route_frequency: number
  flights_by_direction: Record<string, Record<string, string[]>>
  distance_km: number
}

type RoutesFeatureCollection = FeatureCollection<
  LineString,
  RoutesGeoJSONProperties
>

export default async function getRoutesGeoJSON() {
  "use cache: private"
  cacheTag("flights")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("routes_geojson")
    .select("*")

  if (error) throw new Error(error.message)

  const features = (data ?? []).map((row) => ({
    type: "Feature" as const,
    geometry: row.geometry as LineString,
    properties: row as RoutesGeoJSONProperties,
  })) as Feature<LineString, RoutesGeoJSONProperties>[]

  return {
    type: "FeatureCollection" as const,
    features,
  } as RoutesFeatureCollection
}
