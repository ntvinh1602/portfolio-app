import { useState, useEffect } from "react"
import {
  Search,
  RotateCcw,
  Funnel,
  TicketsPlane,
  Star,
  Users,
} from "lucide-react"
import { YearPicker } from "@/components/year-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { seatType } from "@flight/config"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
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
    <Card className="h-fit w-full xl:max-w-90 mx-auto">
      <CardHeader>
        <CardTitle>Filter</CardTitle>
        <CardAction>
          <Funnel className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-5">
          <YearPicker
            startYear={startYear}
            value={filters.year ? Number(filters.year) : 9999}
            onChange={(year) =>
              setFilter("year", year == 9999 ? null : year.toString())
            }
          />

          <Field orientation="horizontal">
            <FieldLabel>
              <Users className="stroke-1 size-5" />
            </FieldLabel>
            <Select
              value={filters.airline ?? "all"}
              onValueChange={(v) =>
                setFilter("airline", v === "all" ? null : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Airline" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All Airlines</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Only flights with...</SelectLabel>
                  {airlineOptions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel>
              <Star className="stroke-1 size-5" />
            </FieldLabel>
            <ToggleGroup
              type="multiple"
              value={filters.seatTypes}
              onValueChange={(v) => setFilter("seatTypes", v)}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              {seatType.map((s) => {
                const Icon = s.icon
                return (
                  <ToggleGroupItem
                    key={s.value}
                    value={s.value}
                    className="rounded-xl px-3 text-xs flex-1"
                  >
                    <Icon className="size-3.5" />
                    {s.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel>
              <TicketsPlane className="stroke-1 size-5" />
            </FieldLabel>
            <Input
              placeholder="Flight number"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full"
            />
            <Button size="icon" onClick={commitSearch} aria-label="Search">
              <Search className="size-4" />
            </Button>
          </Field>

          {hasFilters && (
            <Button
              variant="secondary"
              onClick={resetFilters}
              className="w-fit mx-auto"
            >
              <RotateCcw />
              Reset
            </Button>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
