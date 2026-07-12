import { Users, Calendar } from "lucide-react"
import { SelectAllEnabled } from "@/components/filter/select-options"
import { FilterToggleGroup } from "@/components/filter/toggle-options"
import { FilterSearch } from "@/components/filter/text-search"
import { ticketClass } from "./flight-item"
import { FilterState } from "@flight/flight.types"
import { FieldGroup } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"

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
  const yearOptions = Array.from(
    { length: new Date().getFullYear() - startYear + 1 },
    (_, i) => ({
      key: (startYear + i).toString(),
      label: (startYear + i).toString(),
    }),
  ).reverse()

  const setFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <FieldGroup className="gap-4">
      <div className="w-full min-w-0 overflow-hidden border-b border-muted md:flex-1">
        <FilterToggleGroup
          value={filters.ticketClass}
          onValueChange={(v) => {
            if (v) setFilter("ticketClass", v)
          }}
          options={ticketClass}
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-4 w-full">
        <FilterSearch
          placeholder="Flight number"
          value={filters.search}
          onCommit={(v) => setFilter("search", v)}
        />

        <Separator orientation="vertical" className="my-3 hidden xl:block" />

        <SelectAllEnabled
          icon={Users}
          placeholder="Airline"
          value={filters.airline}
          onValueChange={(v) => setFilter("airline", v)}
          allLabel="All Airlines"
          options={airlineOptions.map((a) => ({
            key: a.value,
            label: a.label,
          }))}
        />

        <Separator orientation="vertical" className="my-3 hidden xl:block" />

        <SelectAllEnabled
          icon={Calendar}
          placeholder="Year"
          value={filters.year}
          onValueChange={(v) => setFilter("year", v)}
          allLabel="All Years"
          options={yearOptions}
        />
      </div>
    </FieldGroup>
  )
}
