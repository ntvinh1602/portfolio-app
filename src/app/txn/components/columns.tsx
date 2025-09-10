"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Database } from "@/types/database.types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

// This type is used to define the shape of our data.
export type Transaction = {
  id: string
  type: Database["public"]["Enums"]["transaction_type"]
  transaction_date: string
  description: string
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "transaction_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-foreground"
        >
          Date
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <>{row.getValue("transaction_date")}</>
  },
  {
    accessorKey: "type",
    header: "Type",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    cell: ({ row }) => {
      const raw = row.getValue("type") as string

      const formatted = raw
        .replace(/_/g, " ") // replace underscores with spaces
        .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize each word

      return (
        <div className="flex">
          {
            raw == "buy" ||
            raw == "income" ||
            raw == "deposit" ||
            raw == "borrow" ||
            raw == "dividend"
              ? <Badge variant="inbound">{formatted}</Badge>
              : <Badge variant="outbound">{formatted}</Badge>
          }
        </div>
      )
    }
  },
  {
    accessorKey: "description",
    header: "Description",
    size: 250,
    cell: ({ row }) => <>{row.getValue("description")}</>
  },
]