"use client"

import useSWR from "swr"
import type { FeatureCollection, Feature, Geometry } from "geojson"
import { createClient } from "@/lib/supabase/client"

export interface FlightProperties {
  id: string
  flight_number: string | null
  airline_name: string | null
  departure_time: string | null
  arrival_time: string | null
  route_frequency: number
  distance_km: number | null
  aircraft_model: string | null
  departure_country: string | null
  arrival_country: string | null
  departure_airport_id: string
  arrival_airport_id: string
  seat: string | null
  seat_type: string | null
  seat_position: string | null
  tail_number: string | null
}

type FlightsFeatureCollection = FeatureCollection<
  Geometry,
  FlightProperties
>

// ---------- Fetcher ----------
async function fetchFlightsGeoJSON(): Promise<FlightsFeatureCollection> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema("flight")
    .from("flights_geojson")
    .select("*")

  if (error) throw error

  const features: Feature<Geometry, FlightProperties>[] = data.map((row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
      id: row.id,
      flight_number: row.flight_number,
      airline_name: row.airline_name,
      departure_time: row.departure_time,
      arrival_time: row.arrival_time,
      route_frequency: row.route_frequency,
      distance_km: row.distance_km,
      aircraft_model: row.aircraft_model,
      departure_country: row.departure_country,
      arrival_country: row.arrival_country,
      ...row.properties,
    },
  }))

  return {
    type: "FeatureCollection",
    features,
  }
}

// ---------- Hook ----------
export function useFlightsGeoJSON() {
  const { data, error, isLoading, mutate } = useSWR(
    ["flightsGeoJSON"],
    fetchFlightsGeoJSON,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10, // 10 minutes
    }
  )

  return {
    data: data ?? { type: "FeatureCollection", features: [] },
    error,
    isLoading,
    mutate,
  }
}