"use client"

import { useState, useEffect } from "react"
import { Search, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DatePicker } from "@/components/date-picker"
import { category, operation } from "../../domain/txn-labels"

export interface TransactionFilterState {
  categories: string[]
  operation: string | null
  search: string
}

export type Preset = "1M" | "3M" | "6M" | "1Y" | "CUSTOM"

interface TransactionFilterProps {
  filters: TransactionFilterState
  onFiltersChange: (filters: TransactionFilterState) => void
  preset: Preset
  onPresetChange: (preset: Preset) => void
  customStartDate: Date
  customEndDate: Date
  onCustomStartDateChange: (date: Date | undefined) => void
  onCustomEndDateChange: (date: Date | undefined) => void
}

export function TxnFilter({
  filters,
  onFiltersChange,
  preset,
  onPresetChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: TransactionFilterProps) {
  const hasFilters =
    filters.categories.length > 0 ||
    filters.operation !== null ||
    filters.search !== ""

  const setFilter = <K extends keyof TransactionFilterState>(
    key: K,
    value: TransactionFilterState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const resetFilters = () => {
    onFiltersChange({
      categories: [],
      operation: null,
      search: "",
    })
  }

  // Deferred search — typing in the memo field updates local state only.
  // The actual filter (and therefore the query) is only updated when the
  // user clicks the search button or presses Enter.  This prevents
  // per-keystroke store recreation and scroll-position resets.
  const [searchInput, setSearchInput] = useState(filters.search)

  // Sync local state when filters are reset externally
  useEffect(() => {
    setSearchInput(filters.search)
  }, [filters.search])

  const commitSearch = () => {
    setFilter("search", searchInput)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch()
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Date range */}
      <Select
        value={preset}
        onValueChange={(value) => onPresetChange(value as Preset)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1M">Last 1 month</SelectItem>
          <SelectItem value="3M">Last 3 months</SelectItem>
          <SelectItem value="6M">Last 6 months</SelectItem>
          <SelectItem value="1Y">Last 1 year</SelectItem>
          <SelectItem value="CUSTOM">Custom...</SelectItem>
        </SelectContent>
      </Select>

      {preset === "CUSTOM" && (
        <DatePicker
          dateFrom={customStartDate}
          dateTo={customEndDate}
          onDateFromChange={onCustomStartDateChange}
          onDateToChange={onCustomEndDateChange}
        />
      )}

      {/* Category toggle */}
      <ToggleGroup
        type="multiple"
        value={filters.categories}
        onValueChange={(v) => setFilter("categories", v)}
        variant="outline"
        spacing={0}
      >
        {category.map((c) => {
          const Icon = c.icon
          return (
            <ToggleGroupItem
              key={c.value}
              value={c.value}
              className="rounded-xl px-3 text-xs"
            >
              <Icon className="size-3.5" />
              {c.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>

      {/* Operation select */}
      <Select
        value={filters.operation ?? "all"}
        onValueChange={(v) => setFilter("operation", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Operation" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Operations</SelectItem>
          {operation.map((o) => {
            const Icon = o.icon
            return (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  <Icon className="size-3.5" />
                  {o.label}
                </span>
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* Memo search — deferred until user confirms */}
      <div className="flex w-full gap-1">
        <Input
          placeholder="Search by memo…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full"
        />
        <Button size="icon" onClick={commitSearch} aria-label="Search">
          <Search className="size-4" />
        </Button>
      </div>

      {/* Reset */}
      {hasFilters && (
        <Button variant="secondary" onClick={resetFilters}>
          <RotateCcw />
          Reset
        </Button>
      )}
    </div>
  )
}
