"use client"

import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { ArrowUpDown } from "lucide-react"

export type Transaction = {
  id: string
  created_at: string
  category: "cashflow" | "stock" | "debt"
  memo: string
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const formatted = format(row.getValue("created_at"), "dd MMM yyyy")
      return formatted
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.getValue("category") as string
      const formatted = category.charAt(0).toUpperCase() + category.slice(1)
      return formatted
    },
  },
  {
    accessorKey: "memo",
    header: "Description",
  },
]