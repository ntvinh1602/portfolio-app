"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { category, operation } from "./labels"
import { DataTableFacetedFilter } from "./filters"
import { DataTableViewOptions } from "./views"


interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {table.getColumn("category") && (
          <DataTableFacetedFilter
            column={table.getColumn("category")}
            title="Category"
            options={category}
          />
        )}
        {table.getColumn("operation") && (
          <DataTableFacetedFilter
            column={table.getColumn("operation")}
            title="Operation"
            options={operation}
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
          placeholder="Search transactions..."
          value={(table.getColumn("memo")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("memo")?.setFilterValue(event.target.value)
          }
          className="w-[150px] lg:w-[250px]"
        />
        <DataTableViewOptions table={table} />
        </div>
    </div>
  )
}