"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import FlightForm from "./form/flightsForm"
import { DataTable } from "./table/data-table"
import { columns, type Flight } from "./table/columns"

interface FlightsClientProps {
  airlines: { id: string; name: string }[]
  aircrafts: { id: string; icao_code: string; model?: string | null }[]
  airports: { id: string; iata_code: string; name: string }[]
  flights: Flight[]
}

export default function FlightsClient({
  airlines,
  aircrafts,
  airports,
  flights,
}: FlightsClientProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const airlineOptions = React.useMemo(() => {
    const seen = new Set<string>()
    const options: { label: string; value: string }[] = []

    for (const f of flights) {
      if (!seen.has(f.airline_name)) {
        seen.add(f.airline_name)
        options.push({ label: f.airline_name, value: f.airline_name })
      }
    }

    return options
  }, [flights])

  const handleFlightAdded = () => {
    router.refresh()
  }

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
        onSuccess={handleFlightAdded}
        FormComponent={(props: { onSuccess?: () => void }) => (
          <FlightForm
            {...props}
            airlines={airlines}
            aircrafts={aircrafts}
            airports={airports}
          />
        )}
      />

      <DataTable
        columns={columns}
        data={flights}
        airlineOptions={airlineOptions}
      />
    </div>
  )
}