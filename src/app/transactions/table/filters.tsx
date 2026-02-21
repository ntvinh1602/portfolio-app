"use client"

import { Column } from "@tanstack/react-table"
import { PlusCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
  }[]
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const selectedValues = new Set(
    (column?.getFilterValue() as string[]) ?? []
  )

  const toggleOption = (value: string) => {
    const newValues = new Set(selectedValues)

    if (newValues.has(value)) {
      newValues.delete(value)
    } else {
      newValues.add(value)
    }

    const filterValues = Array.from(newValues)
    column?.setFilterValue(
      filterValues.length ? filterValues : undefined
    )
  }

  const clearFilters = () => {
    column?.setFilterValue(undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}

          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {selectedValues.size}
              </Badge>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-40">

        {options.map((option) => {
          const isSelected = selectedValues.has(option.value)

          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={isSelected}
              onCheckedChange={() => toggleOption(option.value)}
            >
              <span className="flex items-center justify-between w-full">
                {option.label}
                {facets?.get(option.value) && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {facets.get(option.value)}
                  </span>
                )}
              </span>
            </DropdownMenuCheckboxItem>
          )
        })}

        {selectedValues.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}