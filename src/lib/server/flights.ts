"use server"
import type { FlightFormValues } from "@/app/flights/history/form/flightsForm"
import { createClient } from "@/lib/supabase/server"

export async function createFlight(values: FlightFormValues) {
  const supabase = await createClient()

  // 1. Fetch airport timezones
  const { data: airports } = await supabase
    .schema("flight")
    .from("airports")
    .select("id, timezone")
    .in("id", [values.departureAirportId, values.arrivalAirportId])

  if (!airports || airports.length !== 2) {
    throw new Error("Airport timezone lookup failed")
  }

  const departureAirport = airports.find(
    (a) => a.id === values.departureAirportId
  )
  const arrivalAirport = airports.find(
    (a) => a.id === values.arrivalAirportId
  )

  if (!departureAirport || !arrivalAirport) {
    throw new Error("Missing airport")
  }

  // 2. Convert local -> UTC using Postgres
  const { data, error } = await supabase.schema("flight").rpc("insert_flight_with_timezone", {
    p_flight_number: values.flightNumber,
    p_airline_id: values.airlineId,
    p_aircraft_id: values.aircraftId,
    p_departure_airport_id: values.departureAirportId,
    p_arrival_airport_id: values.arrivalAirportId,
    p_departure_local: values.departureTimeLocal,
    p_arrival_local: values.arrivalTimeLocal,
  })

  if (error) throw new Error(error.message)

  return data
}