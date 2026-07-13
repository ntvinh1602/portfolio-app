"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { FormDialogWrapper } from "@/components/form/form-wrapper"
import FlightForm from "@flight/form/flightsForm"
import { useFlightsOptions } from "./flights-options-context"
import { useFlightsData } from "./flights-data-context"
import { useFlightFormAdapter } from "@flight/hooks/use-flight-form-adapter"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"
import type { Flight } from "../ui/flight-config"

interface FlightItemMenuProps {
  flight: Flight
}

export function FlightItemMenu({ flight }: FlightItemMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const {
    actions: { deleteFlight, triggerRefresh },
  } = useFlightsData()

  const handleEdit = () => {
    setDropdownOpen(false)
    setEditing(true)
  }

  const handleDelete = () => {
    setDropdownOpen(false)
    void deleteFlight(flight.id)
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="size-4" />
            Edit Flight
          </DropdownMenuItem>
          <ConfirmDialog
            message="Are you sure you want to delete this flight? This action cannot be undone."
            onConfirm={handleDelete}
          >
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => e.preventDefault()}
            >
              <Trash2 className="size-4" />
              Delete Flight
            </DropdownMenuItem>
          </ConfirmDialog>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditFlightDialog
        flight={flight}
        open={editing}
        onClose={() => setEditing(false)}
        onSuccess={() => {
          setEditing(false)
          triggerRefresh()
        }}
      />
    </>
  )
}

function EditFlightDialog({
  flight,
  open,
  onClose,
  onSuccess,
}: {
  flight: Flight
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { airlineFormOptions, aircraftFormOptions, airportFormOptions } =
    useFlightsOptions()

  const flightToFormData = useFlightFormAdapter({
    airlineFormOptions,
    aircraftFormOptions,
    airportFormOptions,
  })

  return (
    <FormDialogWrapper
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      title="Edit Flight"
      subtitle="Update flight details"
      onSuccess={onSuccess}
      FormComponent={(props) => (
        <FlightForm
          {...props}
          airlineOptions={airlineFormOptions}
          aircraftOptions={aircraftFormOptions}
          airportOptions={airportFormOptions}
          initialData={flightToFormData(flight) as Record<string, unknown>}
          flightId={flight.id}
        />
      )}
    />
  )
}
