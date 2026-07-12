import * as z from "zod"

export const flightSchema = z
  .object({
    departureAirportId: z.string().uuid("Departure airport required"),
    departureTimeLocal: z.string().min(1, "Departure local time required"),
    arrivalAirportId: z.string().uuid("Arrival airport required"),
    arrivalTimeLocal: z.string().min(1, "Arrival local time required"),
    flightNumber: z
      .string()
      .min(3, "Flight number required")
      .transform((val) => val.toUpperCase()),
    airlineId: z.string().uuid("Airline required"),
    ticketClass: z.string().min(1, "Ticket class required"),
    seatNo: z
      .string()
      .nullable()
      .transform((val) => val || null),
    seatPos: z.string().nullable(),
    aircraftId: z.string().nullable(),
    tailNo: z
      .string()
      .nullable()
      .transform((val) => val || null),
    notes: z
      .string()
      .nullable()
      .transform((val) => val || null),
  })
  .refine((data) => data.departureAirportId !== data.arrivalAirportId, {
    message: "Departure and arrival airports must differ",
    path: ["arrivalAirportId"],
  })

export type FlightFormValues = z.infer<typeof flightSchema>
