"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { seatTypes } from "./labels"
import {
  DataTableFacetedFilter,
  DataTableViewOptions
} from "@/components/table"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  airlineOptions?: { label: string; value: string }[]
}

export function DataTableToolbar<TData>({
  table,
  airlineOptions = [],
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {airlineOptions.length > 0 && table.getColumn("airline_name") && (
          <DataTableFacetedFilter
            column={table.getColumn("airline_name")}
            title="Airline"
            options={airlineOptions}
          />
        )}
        {table.getColumn("seat_type") && (
          <DataTableFacetedFilter
            column={table.getColumn("seat_type")}
            title="Seat"
            options={seatTypes}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Search flight number..."
          value={(table.getColumn("flight_number")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("flight_number")?.setFilterValue(event.target.value)
          }
          className="w-[150px] lg:w-[250px]"
        />
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}