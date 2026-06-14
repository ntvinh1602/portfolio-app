"use client"

import { formatNum } from "@/lib/utils"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { DataTableRowActions, DataTableColumnHeader } from "@/components/table"

export type Flight = {
  flight_number: string
  tail_number: string | null
  departure_time: string
  arrival_time: string
  departure_airport: string
  arrival_airport: string
  airline_name: string
  aircraft_model: string
  seat: string | null
  seat_type: string
  seat_position: string | null
  distance_km: number
}

export const columns: ColumnDef<Flight>[] = [
  {
    accessorKey: "departure_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Departure" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("departure_time") as string
      return (
        <div className="w-[160px]">
          {format(new Date(value), "yyyy-MM-dd HH:mm")}
        </div>
      )
    },
  },
  {
    accessorKey: "arrival_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Arrival" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("arrival_time") as string
      return (
        <div className="w-[160px]">
          {format(new Date(value), "yyyy-MM-dd HH:mm")}
        </div>
      )
    },
  },
  {
    id: "route",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Route" />
    ),
    cell: ({ row }) => {
      const { departure_airport: dep, arrival_airport: arr } = row.original

      return (
        <div className="font-medium">
          {dep} → {arr}
        </div>
      )
    },
  },
  {
    accessorKey: "flight_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Flight" />
    ),
  },
  {
    accessorKey: "airline_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Airline" />
    ),
  },
  {
    accessorKey: "aircraft_model",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Aircraft" />
    ),
  },
  {
    accessorKey: "tail_number",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tail #" />
    ),
  },
  {
    id: "seat_info",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Seat" />
    ),
    cell: ({ row }) => {
      const { seat, seat_type, seat_position } = row.original

      const parts = [seat, seat_type, seat_position].filter(Boolean)
      return <div>{parts.length > 0 ? parts.join(" • ") : "—"}</div>
    },
  },
  {
    accessorKey: "seat_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Seat Type" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("seat_type") as string
      const labels: Record<string, string> = {
        economy: "Economy",
        premium_economy: "Premium Economy",
        business: "Business",
      }
      return <div>{labels[value] ?? value}</div>
    },
    enableHiding: true,
  },
  {
    accessorKey: "distance_km",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Distance (km)" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("distance_km") as number
      return (
        <div className="text-right w-[100px]">
          {formatNum(value)}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DataTableRowActions row={row} />
      </div>
    ),
  },
]