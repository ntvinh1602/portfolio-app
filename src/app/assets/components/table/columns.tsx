"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Tables } from "@/types/database.types"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
    cell: ({ row }) => {
      const value = row.getValue("asset_class") as string
      return <>{value.replace(/\b\w/g, (c) => c.toUpperCase())}</>
    }
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <>{row.getValue("name")}</>
  },
  {
    accessorKey: "is_active",
    header: () => (
      <div className="flex justify-center items-center">
        <Tooltip>
          <TooltipTrigger>
            <span className="border-b-1 border-foreground/40 border-dashed py-0.5">Fetching</span>
          </TooltipTrigger>
          <TooltipContent>
            Disabled assets are excluded from price fetching and saving
          </TooltipContent>
        </Tooltip>
      </div>
    ),
    size: 80,
    cell: ({ row }) => {
      const value = row.getValue("is_active") as boolean
      return (
        <div className="flex justify-center items-center">
          <Badge variant={value ? "inbound" : "outbound"}>
            {value ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      )
    },
  }
]
