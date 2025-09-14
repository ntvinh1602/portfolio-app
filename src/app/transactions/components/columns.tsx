"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Database } from "@/types/database.types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { assetClassFormatter } from "@/lib/utils"

// This type is used to define the shape of our data.
export type Transaction = {
  id: string
  transaction_date: string
  type: Database["public"]["Enums"]["transaction_type"]
  description: string
  category: "trade" | "cash"
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "transaction_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-foreground gap-1"
        > 
          Date
          <ArrowUpDown className="size-4 stroke-1" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="pl-3">
      {row.getValue("transaction_date")}
    </div>
  },
  {
    accessorKey: "type",
    header: "Type",
    filterFn: (row, id, value: string[]) => {
      if (!value || value.length === 0) return true
      const set = new Set(value) // O(1) lookups
      return set.has(row.getValue(id))
    },
    cell: ({ row }) => {
      const raw = row.getValue("type") as string
      const formatted = assetClassFormatter(raw)

      return (
        <div className="flex">
          {["buy", "income", "deposit", "borrow", "dividend"].includes(raw)
            ? <Badge variant="inbound">{formatted}</Badge>
            : <Badge variant="outbound">{formatted}</Badge>
          }
        </div>
    )}
  },
  {
    accessorKey: "description",
    header: "Description",
    size: 250,
    cell: ({ row }) => <>{row.getValue("description")}</>
  },
]