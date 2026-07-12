"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AddFlight } from "@flight/actions/add-flight"
import { EditFlight } from "@flight/actions/edit-flight"
import { TextField } from "@/components/form/text-field"
import { SelectField } from "@/components/form/select-field"
import { ComboboxField } from "@/components/form/combobox-field"
import { DateTimeField } from "@/components/form/datetime-field"
import { FieldGroup, FieldTitle } from "@/components/ui/field"
import { flightSchema, type FlightFormValues } from "./schema"
import { ticketClass } from "../components/ui/flight-item"
import { ToggleGroupField } from "@/components/form/toggle-group-field"

interface FlightFormProps {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
  airlineOptions: { value: string; label: string }[]
  aircraftOptions: { value: string; label: string }[]
  airportOptions: { value: string; label: string }[]
  initialData?: Partial<FlightFormValues>
  flightId?: string
}

export default function FlightForm({
  onSuccess,
  formId,
  onLoadingChange,
  resetFormRef,
  airlineOptions,
  aircraftOptions,
  airportOptions,
  initialData,
  flightId,
}: FlightFormProps) {
  const form = useForm<FlightFormValues>({
    resolver: zodResolver(flightSchema),
    defaultValues: {
      departureAirportId: initialData?.departureAirportId ?? "",
      departureTimeLocal: initialData?.departureTimeLocal ?? "",
      arrivalAirportId: initialData?.arrivalAirportId ?? "",
      arrivalTimeLocal: initialData?.arrivalTimeLocal ?? "",
      flightNumber: initialData?.flightNumber ?? "",
      airlineId: initialData?.airlineId ?? "",
      ticketClass: initialData?.ticketClass ?? "eco",
      seatNo: initialData?.seatNo ?? null,
      seatPos: initialData?.seatPos ?? null,
      aircraftId: initialData?.aircraftId ?? null,
      tailNo: initialData?.tailNo ?? null,
      notes: initialData?.notes ?? null,
    },
  })

  React.useEffect(() => {
    resetFormRef.current = () => form.reset()
  }, [form, resetFormRef])

  const handleSubmit = form.handleSubmit(async (values) => {
    onLoadingChange(true)

    try {
      if (flightId) {
        await EditFlight(flightId, values)
        toast.success("Flight updated successfully", {
          description: `Flight number ${values.flightNumber} updated`,
        })
      } else {
        await AddFlight(values)
        toast.success("Flight added successfully", {
          description: `Flight number ${values.flightNumber} created`,
        })
      }

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

      toast.error(flightId ? "Failed to update flight" : "Failed to create flight", {
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
          items={airportOptions}
          label="Departure Airport"
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
          items={airportOptions}
          label="Arrival Airport"
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
          options={airlineOptions}
          label="Airline"
          placeholder="Airlines"
        />
        <ToggleGroupField
          control={form.control}
          name="ticketClass"
          options={ticketClass}
        />
        <TextField
          control={form.control}
          name="seatNo"
          label="Seat Number"
          placeholder="Seat number"
        />
        <ToggleGroupField
          control={form.control}
          name="seatPos"
          options={[
            { key: "window", label: "Window" },
            { key: "middle", label: "Middle" },
            { key: "aisle", label: "Aisle" },
          ]}
        />
        <SelectField<FlightFormValues>
          control={form.control}
          name="aircraftId"
          options={aircraftOptions}
          label="Aircraft"
          placeholder="Aircraft type"
        />
        <TextField
          control={form.control}
          name="tailNo"
          label="Tail Number"
          placeholder="Aircraft registration"
        />
        <TextField
          control={form.control}
          name="notes"
          label="Notes"
          placeholder="Notes"
        />
      </FieldGroup>
    </form>
  )
}
