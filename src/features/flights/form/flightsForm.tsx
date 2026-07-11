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
import { FieldDescription, FieldGroup, FieldTitle } from "@/components/ui/field"
import { flightSchema, type FlightFormValues } from "./schema"

interface FlightFormProps {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
  airlineOptions: { value: string; label: string }[]
  aircraftOptions: { value: string; label: string }[]
  airportOptions: { value: string; label: string }[]
}

export default function FlightForm({
  onSuccess,
  formId,
  onLoadingChange,
  resetFormRef,
  airlineOptions,
  aircraftOptions,
  airportOptions,
}: FlightFormProps) {
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

  React.useEffect(() => {
    resetFormRef.current = () => form.reset()
  }, [form, resetFormRef])

  const handleSubmit = form.handleSubmit(async (values) => {
    onLoadingChange(true)

    try {
      await AddFlight(values)

      toast.success("Flight added successfully", {
        description: `${values.flightNumber} created`,
      })

      form.reset()
      onSuccess?.()
    } catch (err: unknown) {
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
      onLoadingChange(false)
    }
  })

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <FieldGroup className="gap-3">
        <FieldTitle>Departure from</FieldTitle>
        <ComboboxField
          control={form.control}
          name="departureAirportId"
          label="Departure Airport"
          items={airportOptions}
          placeholder="Departure airport"
          emptyPlaceholder="No airport found"
        />
        <DateTimeField
          control={form.control}
          name="departureTimeLocal"
          label="Departure (Local Time)"
          placeholder="Departure local time"
        />
        <FieldTitle>Arrive to</FieldTitle>
        <ComboboxField
          control={form.control}
          name="arrivalAirportId"
          label="Arrival Airport"
          items={airportOptions}
          placeholder="Arrival airport"
          emptyPlaceholder="No airport found"
        />
        <DateTimeField
          control={form.control}
          name="arrivalTimeLocal"
          label="Arrival (Local Time)"
          placeholder="Arrival local time"
        />
        <FieldTitle>Flight Details</FieldTitle>
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
          placeholder="Aircraft type *"
        />
        <TextField
          control={form.control}
          name="notes"
          label="Notes"
          placeholder="Notes *"
        />
        <FieldDescription className="text-end text-xs px-2">
          * Optional data, can edit later
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
