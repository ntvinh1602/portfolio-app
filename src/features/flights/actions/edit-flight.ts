"use server"

import type { FlightFormValues } from "@flight/form/schema"
import { createClient } from "@/lib/supabase/server"

export async function EditFlight(flightId: string, values: FlightFormValues) {
  const supabase = await createClient()

  const { error } = await supabase
    .schema("flight")
    .from("flights")
    .update({
      departure_airport_id: values.departureAirportId,
      departure_time: values.departureTimeLocal,
      arrival_airport_id: values.arrivalAirportId,
      arrival_time: values.arrivalTimeLocal,
      flight_number: values.flightNumber,
      airline_id: values.airlineId,
      ticket_class: values.ticketClass,
      seat_number: values.seatNo,
      seat_position: values.seatPos,
      aircraft_id: values.aircraftId,
      tail_number: values.tailNo,
      notes: values.notes,
    })
    .eq("id", flightId)

  if (error) throw new Error(error.message)
}
