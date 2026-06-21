"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

export interface AirlineOption {
  id: string
  name: string
}

export interface AircraftOption {
  id: string
  icao_code: string
  model?: string | null
}

export interface AirportOption {
  id: string
  iata_code: string
  name: string
}

interface FlightReferenceData {
  airlines: AirlineOption[]
  aircrafts: AircraftOption[]
  airports: AirportOption[]
}

async function fetchReferenceData(): Promise<FlightReferenceData> {
  const supabase = createClient()

  const [airlinesRes, aircraftsRes, airportsRes] = await Promise.all([
    supabase
      .schema("flight")
      .from("airlines")
      .select("id, name")
      .order("name"),

    supabase
      .schema("flight")
      .from("aircrafts")
      .select("id, icao_code, model")
      .order("icao_code"),

    supabase
      .schema("flight")
      .from("airports")
      .select("id, iata_code, name")
      .order("iata_code"),
  ])

  if (airlinesRes.error) throw new Error(airlinesRes.error.message)
  if (aircraftsRes.error) throw new Error(aircraftsRes.error.message)
  if (airportsRes.error) throw new Error(airportsRes.error.message)

  return {
    airlines: airlinesRes.data ?? [],
    aircrafts: aircraftsRes.data ?? [],
    airports: airportsRes.data ?? [],
  }
}

export function useFlightReferenceData() {
  const { data, error, isLoading, mutate } = useSWR<FlightReferenceData>(
    "flightReferenceData",
    fetchReferenceData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 600_000, // 10 minutes
    },
  )

  return {
    airlines: data?.airlines ?? [],
    aircrafts: data?.aircrafts ?? [],
    airports: data?.airports ?? [],
    isLoading,
    error,
    mutate,
  }
}
