"use client"

import * as React from "react"
import * as z from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createFlight } from "@/lib/server/flights"

import {
  TextField,
  SelectField,
  ComboboxField,
  DateTimeField
} from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { FieldGroup, Field } from "@/components/ui/field"
import { flightSchema } from "./schema"

export type FlightFormValues = z.infer<typeof flightSchema>

interface FlightFormProps {
  airlines: { id: string; name: string }[]
  aircrafts: { id: string; icao_code: string; model?: string | null }[]
  airports: { id: string; iata_code: string; name: string }[]
  onSuccess?: () => void
}

export default function FlightForm({
  airlines,
  aircrafts,
  airports,
  onSuccess,
}: FlightFormProps) {
  const [loading, setLoading] = React.useState(false)

  const form = useForm<FlightFormValues>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      flightNumber: "",
      airlineId: "",
      aircraftId: "",
      departureAirportId: "",
      arrivalAirportId: "",
      departureTimeLocal: "",
      arrivalTimeLocal: "",
      notes: "",
    },
  })

  const airlineOptions = React.useMemo(
    () => airlines.map((a) => ({ value: a.id, label: a.name })),
    [airlines]
  )

  const aircraftOptions = React.useMemo(
    () =>
      aircrafts.map((a) => ({
        value: a.id,
        label: a.model ? `${a.icao_code} — ${a.model}` : a.icao_code,
      })),
    [aircrafts]
  )

  const airportOptions = React.useMemo(
    () =>
      airports.map((a) => ({
        value: a.id,
        label: `${a.iata_code} — ${a.name}`,
      })),
    [airports]
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true)

    try {
      await createFlight(values)

      toast.success("Flight added successfully", {
        description: `${values.flightNumber} created`,
      })

      form.reset()
      onSuccess?.()

    } catch (err: unknown) {
  console.error("Create flight error:", err)

  let message = "Unexpected database error"

  if (err instanceof Error) {
    message = err.message
  } else if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as any).message === "string"
  ) {
    message = (err as any).message
  }

  toast.error("Failed to create flight", {
    description: message,
  })
} finally {
      setLoading(false)
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <form id="flight-form" onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex gap-2">
            <DateTimeField
              control={form.control}
              name="departureTimeLocal"
              label="Departure (Local Time)"
            />
            <DateTimeField
              control={form.control}
              name="arrivalTimeLocal"
              label="Arrival (Local Time)"
            />
          </div>

          <div className="flex gap-2">
          <TextField
            control={form.control}
            name="flightNumber"
            label="Flight Number"
            placeholder="VN123"
          />

          <SelectField<FlightFormValues>
            control={form.control}
            name="airlineId"
            label="Airline"
            options={airlineOptions}
          />

          </div>

          <SelectField<FlightFormValues>
            control={form.control}
            name="aircraftId"
            label="Aircraft"
            options={aircraftOptions}
          />

          <ComboboxField
            control={form.control}
            name="departureAirportId"
            label="Departure Airport"
            items={airportOptions}
            placeholder="Select departure airport"
            searchPlaceholder="Search airport..."
            emptyPlaceholder="No airport found"
          />

          <ComboboxField
            control={form.control}
            name="arrivalAirportId"
            label="Arrival Airport"
            items={airportOptions}
            placeholder="Select arrival airport"
            searchPlaceholder="Search airport..."
            emptyPlaceholder="No airport found"
          />

          <TextField
            control={form.control}
            name="notes"
            label="Notes"
            placeholder="Seat, delays, experience..."
          />

        </FieldGroup>
      </form>

      <Field className="flex justify-end" orientation="horizontal">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Reset
        </Button>

        <Button type="submit" form="flight-form" disabled={loading}>
          {loading ? "Saving..." : "Save Flight"}
        </Button>
      </Field>
    </div>
  )
}