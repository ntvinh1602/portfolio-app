"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Tables } from "@/types/database.types"
import { assetClassFormatter } from "@/lib/utils"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Tables<"assets">>[] = [
  {
    accessorKey: "ticker",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-foreground gap-1"
        >
          Ticker
          <ArrowUpDown className="size-4 stroke-1" />
        </Button>
      )
    },
    size: 60,
    cell: ({ row }) => <div className="pl-3">{row.getValue("ticker")}</div>
  },
  {
    accessorKey: "asset_class",
    header: "Asset Class",
    filterFn: (row, id, value: string[]) => {
      if (!value || value.length === 0) return true
      const set = new Set(value) // O(1) lookups
      return set.has(row.getValue(id))
    },
    size: 60,
    cell: ({ row }) => <>{assetClassFormatter(row.getValue("asset_class"))}</>
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <>{row.getValue("name")}</>
  },
  {
    accessorKey: "is_active",
    header: "Status",
    size: 60,
    cell: ({ row }) => {
      const value = row.getValue("is_active") as boolean
      return (
        <Badge variant={value ? "inbound" : "outbound"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      )
    },
  }
]
