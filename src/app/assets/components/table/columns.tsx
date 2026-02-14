"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Tables } from "@/types/database.types"
import { MoveDown, MoveUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import * as TT from "@/components/ui/tooltip"

export const columns: ColumnDef<Tables<"assets">>[] = [
  {
    accessorKey: "ticker",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-foreground gap-0 font-light"
        >
          Ticker
          {column.getIsSorted() === "asc"
              ? <MoveUp className="size-4 stroke-1" />
              : <MoveDown className="size-4 stroke-1" />
          }
        </Button>
      )
    },
    size: 60,
    cell: ({ row }) => <div className="pl-3">{row.getValue("ticker")}</div>
  },
  {
    accessorKey: "asset_class",
    header: "Asset Class",
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
        <TT.Root>
          <TT.Trigger className="border-b-1 border-foreground/80 border-dashed">
            Status
          </TT.Trigger>
          <TT.Content>
            Daily data saving will be suspended for inactive assets
          </TT.Content>
        </TT.Root>
      </div>
    ),
    size: 80,
    cell: ({ row }) => {
      const value = row.getValue("is_active") as boolean
      return (
        <div className="flex justify-center items-center">
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        </div>
      )
    },
  }
]
