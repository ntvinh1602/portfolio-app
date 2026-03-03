"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

export type Airport = {
  id: string
  iata_code: string
  name: string
  lat: number
  lng: number
}

async function fetchAirports(): Promise<Airport[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .schema("flight")
    .from("airports")
    .select("id, iata_code, name, lat, lng")

  if (error) throw error
  return data
}

export function useAirports() {
  const { data, error, isLoading } = useSWR(["airports"], fetchAirports, {
    revalidateOnFocus: false,
    dedupingInterval: 1000 * 60 * 30, // 30 minutes
  })

  return {
    data: data ?? [],
    isLoading,
    error,
  }
}