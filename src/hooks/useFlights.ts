"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

async function fetchFlights() {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema("flight")
    .from("flights_readable")
    .select("*")

  if (error) throw error
  return data as {
    flight_number: string
    tail_number: string | null
    departure_time: string
    arrival_time: string
    departure_airport_id: string
    arrival_airport_id: string
    departure_airport: string
    arrival_airport: string
    departure_country: string
    arrival_country: string
    airline_name: string
    aircraft_model: string
    seat: string | null
    seat_type: string
    seat_position: string | null
    distance_km: number
  }[]
}

// ---------- Hook ----------
export function useFlights() {
  const { data, error, isLoading, mutate } = useSWR(
    "flights",
    fetchFlights,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
  }
}
