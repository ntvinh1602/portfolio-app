"use client"

import { formatNum } from "@/lib/utils"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { operation, category } from "./labels"
import { DataTableRowActions } from "./row-action"
import { DataTableColumnHeader } from "./header"

export type Transaction = {
    id: string
    created_at: string
    category: string
    operation: string
    value: number
    memo: string
}

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Time"/>
    ),
    cell: ({ row }) => {
      const formatted = format(row.getValue("created_at"), "yyyy-MM-dd HH:mm")
      return (
        <div className="w-15">{formatted}</div>
      )
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const cat = category.find(
        (category) => category.value === row.getValue("category")
      )

      if (!cat) {
        return null
      }

      return (
        <div className="flex items-center">
          {cat.icon && (
            <cat.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{cat.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    accessorKey: "operation",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Operation" />
    ),
    cell: ({ row }) => {
      const ops = operation.find(
        (operation) => operation.value === row.getValue("operation")
      )

      if (!ops) {
        return null
      }

      return (
        <div className="flex w-20 items-center">
          {ops.icon && (
            <ops.icon className="mr-2 h-4 w-4 text-muted-foreground" />
          )}
          <span>{ops.label}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
  },
  {
    accessorKey: "memo",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Memo" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-125 truncate">
            {row.getValue("memo")}
          </span>
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: "value",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Value" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("value") as number
      const formatted = formatNum(value)
      return (
        <div className="w-15">{formatted}</div>
      )
    },
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => 
      <div className="flex justify-end">
        <DataTableRowActions row={row} />
      </div>
  },
]