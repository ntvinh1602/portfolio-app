"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "./components/flightsForm"

interface FlightsClientProps {
  airlines: { id: string; name: string }[]
  aircrafts: { id: string; icao_code: string; model?: string | null }[]
  airports: { id: string; iata_code: string; name: string }[]
}

export default function FlightsClient({
  airlines,
  aircrafts,
  airports,
}: FlightsClientProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-6">

      <div className="flex justify-end">
        <Button
          onClick={() => setOpen(true)}
          className="rounded-2xl"
        >
          Add Flight
        </Button>
      </div>

      <FormDialogWrapper
        open={open}
        onOpenChange={setOpen}
        title="Add Flight"
        subtitle="Log a new flight into your travel history"
        FormComponent={(props: { onSuccess?: () => void }) => (
          <FlightForm
            {...props}
            airlines={airlines}
            aircrafts={aircrafts}
            airports={airports}
          />
        )}
      />

    </div>
  )
}