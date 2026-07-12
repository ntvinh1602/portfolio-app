"use server"

import type { FlightFormValues } from "@flight/form/schema"
import { createClient } from "@/lib/supabase/server"

export async function AddFlight(values: FlightFormValues) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .schema("flight")
    .rpc("insert_flight_with_timezone", {
      p_departure_airport_id: values.departureAirportId,
      p_departure_local: values.departureTimeLocal,
      p_arrival_airport_id: values.arrivalAirportId,
      p_arrival_local: values.arrivalTimeLocal,
      p_flight_number: values.flightNumber,
      p_airline_id: values.airlineId,
      p_ticket_class: values.ticketClass,
      p_seat_no: values.seatNo,
      p_seat_pos: values.seatPos,
      p_aircraft_id: values.aircraftId,
      p_tail_no: values.tailNo,
      p_notes: values.notes,
    })

  if (error) throw new Error(error.message)

  return data
}
