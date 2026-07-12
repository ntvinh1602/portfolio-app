import { useCallback } from "react"
import type { FlightFormValues } from "@flight/form/schema"
import type { Flight } from "@flight/components/ui/flight-config"

interface FormOptions {
  airlineFormOptions: { label: string; value: string }[]
  aircraftFormOptions: { label: string; value: string }[]
  airportFormOptions: { label: string; value: string }[]
}

/**
 * Converts a Flight (view model) into FlightFormValues (form model)
 * by reverse-mapping display labels back to database IDs.
 */
export function useFlightFormAdapter({
  airlineFormOptions,
  aircraftFormOptions,
  airportFormOptions,
}: FormOptions) {
  return useCallback(
    (flight: Flight): Partial<FlightFormValues> => {
      const matchingAirline = airlineFormOptions.find(
        (opt) => opt.label === flight.airline_name,
      )
      const matchingAircraft = aircraftFormOptions.find((opt) => {
        const model = opt.label.split(" — ")[1]
        return model && model === flight.aircraft_type
      })
      const matchingDeparture = airportFormOptions.find((opt) => {
        const name = opt.label.split(" — ")[1]
        return name === flight.departure_airport_name
      })
      const matchingArrival = airportFormOptions.find((opt) => {
        const name = opt.label.split(" — ")[1]
        return name === flight.arrival_airport_name
      })

      return {
        departureAirportId: matchingDeparture?.value ?? "",
        departureTimeLocal: flight.departure_time
          ? new Date(flight.departure_time).toISOString().slice(0, 16)
          : "",
        arrivalAirportId: matchingArrival?.value ?? "",
        arrivalTimeLocal: flight.arrival_time
          ? new Date(flight.arrival_time).toISOString().slice(0, 16)
          : "",
        flightNumber: flight.flight_number,
        airlineId: matchingAirline?.value ?? "",
        ticketClass: flight.ticket_class,
        seatNo: flight.seat_number,
        seatPos: flight.seat_position,
        aircraftId: matchingAircraft?.value ?? null,
        tailNo: flight.tail_number,
        notes: null,
      }
    },
    [airlineFormOptions, aircraftFormOptions, airportFormOptions],
  )
}
