import * as z from "zod"

export const flightSchema = z
  .object({
    flightNumber: z
      .string()
      .min(2, "Required")
      .transform((val) => val.toUpperCase()),
    airlineId: z.string().uuid("Invalid airline"),
    aircraftId: z.string().uuid("Invalid aircraft"),
    departureAirportId: z.string().uuid("Invalid airport"),
    arrivalAirportId: z.string().uuid("Invalid airport"),
    departureTimeLocal: z.string().min(1, "Required"),
    arrivalTimeLocal: z.string().min(1, "Required"),
    notes: z.string().optional(),
  })
  .refine(
    (data) => data.departureAirportId !== data.arrivalAirportId,
    {
      message: "Departure and arrival airports must differ",
      path: ["arrivalAirportId"],
    }
  )