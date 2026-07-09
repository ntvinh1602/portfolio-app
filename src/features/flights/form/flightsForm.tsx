"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AddFlight } from "@flight/actions/add-flight"

import { TextField } from "@/components/form/text-field"
import { SelectField } from "@/components/form/select-field"
import { ComboboxField } from "@/components/form/combobox-field"
import { DateTimeField } from "@/components/form/datetime-field"
import { Button } from "@/components/ui/button"
import { FieldGroup, Field, FieldTitle } from "@/components/ui/field"
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
        typeof (err as { message: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message
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
        <FieldGroup className="gap-3">
          <FieldTitle>Departure</FieldTitle>
          <ComboboxField
            control={form.control}
            name="departureAirportId"
            label="Departure Airport"
            items={airportOptions}
            placeholder="Airport"
            searchPlaceholder="Search airport..."
            emptyPlaceholder="No airport found"
          />
          <DateTimeField
            control={form.control}
            name="departureTimeLocal"
            label="Departure (Local Time)"
            placeholder="Local time"
          />

          <FieldTitle>Arrival</FieldTitle>
          <ComboboxField
            control={form.control}
            name="arrivalAirportId"
            label="Arrival Airport"
            items={airportOptions}
            placeholder="Airport"
            searchPlaceholder="Search airport..."
            emptyPlaceholder="No airport found"
          />
          <DateTimeField
            control={form.control}
            name="arrivalTimeLocal"
            label="Arrival (Local Time)"
            placeholder="Local time"
          />

          <FieldTitle>Flight Information</FieldTitle>
          <TextField
            control={form.control}
            name="flightNumber"
            label="Flight Number"
            placeholder="Flight number"
          />

          <SelectField<FlightFormValues>
            control={form.control}
            name="airlineId"
            label="Airline"
            options={airlineOptions}
            placeholder="Airlines"
          />

          <SelectField<FlightFormValues>
            control={form.control}
            name="aircraftId"
            label="Aircraft"
            options={aircraftOptions}
            placeholder="Aircraft type"
          />

          <TextField
            control={form.control}
            name="notes"
            label="Notes"
            placeholder="Notes"
          />
        </FieldGroup>
      </form>

      <Field className="flex justify-end" orientation="horizontal">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>

        <Button type="submit" form="flight-form" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </Field>
    </div>
  )
}
