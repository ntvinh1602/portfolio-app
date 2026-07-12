"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/form-wrapper"
import FlightForm from "@flight/form/flightsForm"
import { PlusIcon } from "lucide-react"
import { useFlightsData } from "./flights-data-context"
import { useFlightsOptions } from "./flights-options-context"

export function AddFlightSection() {
  const [open, setOpen] = useState(false)
  const {
    actions: { triggerRefresh },
  } = useFlightsData()
  const { airlineFormOptions, aircraftFormOptions, airportFormOptions } =
    useFlightsOptions()

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon />
        Add Flight
      </Button>
      <FormDialogWrapper
        open={open}
        onOpenChange={setOpen}
        title="Add Flight"
        subtitle="Log a new flight into your travel history"
        onSuccess={triggerRefresh}
        FormComponent={(props) => (
          <FlightForm
            {...props}
            airlineOptions={airlineFormOptions}
            aircraftOptions={aircraftFormOptions}
            airportOptions={airportFormOptions}
          />
        )}
      />
    </>
  )
}
