"use client"

import { X } from "lucide-react"
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

const SEAT_TYPES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Prem. Econ" },
  { value: "business", label: "Business" },
]

export interface FilterState {
  year: string | null       // "all" or a year string like "2024"
  airline: string | null    // "all" or an airline name
  seatTypes: string[]       // selected seat type values
  search: string            // flight number search
}

interface FilterBarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  airlineOptions: { label: string; value: string }[]
  availableYears: string[]
}

export function FilterBar({
  filters,
  onFiltersChange,
  airlineOptions,
  availableYears,
}: FilterBarProps) {
  const hasFilters =
    filters.year !== null ||
    filters.airline !== null ||
    filters.seatTypes.length > 0 ||
    filters.search !== ""

  const setFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const resetFilters = () => {
    onFiltersChange({
      year: null,
      airline: null,
      seatTypes: [],
      search: "",
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Year filter */}
      <Select
        value={filters.year ?? "all"}
        onValueChange={(v) => setFilter("year", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[120px] rounded-xl">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {availableYears.map((y) => (
            <SelectItem key={y} value={y}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Airline filter */}
      <Select
        value={filters.airline ?? "all"}
        onValueChange={(v) => setFilter("airline", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[170px] rounded-xl">
          <SelectValue placeholder="Airline" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Airlines</SelectItem>
          {airlineOptions.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Seat type toggle */}
      <ToggleGroup
        type="multiple"
        value={filters.seatTypes}
        onValueChange={(v) => setFilter("seatTypes", v)}
        className="gap-0"
        variant="outline"
      >
        {SEAT_TYPES.map((s) => (
          <ToggleGroupItem
            key={s.value}
            value={s.value}
            className="rounded-xl px-3 text-xs"
          >
            {s.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Search */}
      <Input
        placeholder="Flight number…"
        value={filters.search}
        onChange={(e) => setFilter("search", e.target.value)}
        className="flex-1 min-w-0 rounded-xl"
      />

      {/* Reset */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-9 rounded-xl text-muted-foreground hover:text-foreground"
        >
          Reset
          <X className="ml-1 size-3.5" />
        </Button>
      )}
    </div>
  )
}
