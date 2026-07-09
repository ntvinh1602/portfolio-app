"use client"

import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "@flight/form/flightsForm"
import { PlusIcon } from "lucide-react"
import { useAddFlight } from "./add-flight-context"
import { useFlightsData } from "./flights-data-context"

export function AddFlightSection() {
  const {
    state: { open },
    actions: { setOpen },
  } = useAddFlight()
  const {
    actions: { triggerRefresh },
    options: { airlineFormOptions, aircraftFormOptions, airportFormOptions },
  } = useFlightsData()

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
        FormComponent={(props: { onSuccess?: () => void }) => (
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
