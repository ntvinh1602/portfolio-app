"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AddFlight } from "@/features/flights/actions/add-flight"

import { TextField } from "@/components/form/fields/text-field"
import { SelectField } from "@/components/form/fields/select-field"
import { ComboboxField } from "@/components/form/fields/combobox-field"
import { DateTimeField } from "@/components/form/fields/datetime-field"
import { Button } from "@/components/ui/button"
import { FieldGroup, Field } from "@/components/ui/field"
import { flightSchema, type FlightFormValues } from "./schema"

interface FlightFormProps {
  onSuccess?: () => void
  airlineOptions: { value: string; label: string }[]
  aircraftOptions: { value: string; label: string }[]
  airportOptions: { value: string; label: string }[]
}

export default function FlightForm({
  onSuccess,
  airlineOptions,
  aircraftOptions,
  airportOptions,
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

  const handleSubmit = form.handleSubmit(async (values) => {
    setLoading(true)

    try {
      await AddFlight(values)

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
