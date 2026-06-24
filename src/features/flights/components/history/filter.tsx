import { useState, useEffect } from "react"
import { Search, RotateCcw } from "lucide-react"
import { YearPicker } from "@/components/year-picker"
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

const ALL_TIME_YEAR = 9999

export interface FilterState {
  year: string | null // "all" or a year string like "2024"
  airline: string | null // "all" or an airline name
  seatTypes: string[] // selected seat type values
  search: string // flight number search
}

interface FilterBarProps {
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
}: FilterBarProps) {
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

  // Deferred search — typing updates local state only.
  // The filter (and therefore the query) is only updated on button click
  // or Enter, preventing per-keystroke store recreation.
  const [searchInput, setSearchInput] = useState(filters.search)

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
      {/* Year filter */}
      <YearPicker
        startYear={startYear}
        value={filters.year ? Number(filters.year) : ALL_TIME_YEAR}
        onChange={(year) =>
          setFilter("year", year === ALL_TIME_YEAR ? null : year.toString())
        }
      />

      {/* Airline filter */}
      <Select
        value={filters.airline ?? "all"}
        onValueChange={(v) => setFilter("airline", v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full">
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
        variant="outline"
        spacing={0}
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

      {/* Search — deferred until user confirms */}
      <div className="flex w-full gap-1">
        <Input
          placeholder="Flight number…"
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
