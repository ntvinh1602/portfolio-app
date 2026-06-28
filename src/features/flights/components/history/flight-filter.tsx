import { useState, useEffect } from "react"
import { TicketsPlane, Users, Star } from "lucide-react"
import { YearPicker } from "@/components/year-picker"
import { FilterCard } from "@/components/filter/filter-card"
import { FilterSelect } from "@/components/filter/filter-select"
import { FilterToggleGroup } from "@/components/filter/filter-toggle-group"
import { FilterSearch } from "@/components/filter/filter-search"
import { seatType } from "@flight/config"
import { FilterState } from "@flight/flight.types"

interface Props {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  airlineOptions: { label: string; value: string }[]
  startYear: number
}

export function FlightFilter({
  filters,
  onFiltersChange,
  airlineOptions,
  startYear,
}: Props) {
  const hasFilters =
    filters.year !== null ||
    filters.airline !== null ||
    filters.seatTypes.length > 0 ||
    filters.search !== ""

  const setFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
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
    <FilterCard hasFilters={hasFilters} onReset={resetFilters}>
      <YearPicker
        startYear={startYear}
        value={filters.year ? Number(filters.year) : 9999}
        onChange={(year) =>
          setFilter("year", year == 9999 ? null : year.toString())
        }
      />

      <FilterSelect
        icon={Users}
        placeholder="Airline"
        value={filters.airline}
        onValueChange={(v) => setFilter("airline", v)}
        allLabel="All Airlines"
        groupLabel="Only flights with..."
        options={airlineOptions.map((a) => ({ key: a.value, label: a.label }))}
      />

      <FilterToggleGroup
        icon={Star}
        value={filters.seatTypes}
        onValueChange={(v) => setFilter("seatTypes", v)}
        options={seatType}
      />

      <FilterSearch
        icon={TicketsPlane}
        placeholder="Flight number"
        value={filters.search}
        onCommit={(v) => setFilter("search", v)}
      />
    </FilterCard>
  )
}
