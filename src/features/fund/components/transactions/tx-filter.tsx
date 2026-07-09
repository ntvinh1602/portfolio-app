"use client"
import { Calendar } from "lucide-react"
import { DateRangePicker } from "@/components/date-picker"
import { txCategory, categoryOps, withCustom } from "@fund/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { FilterSearch } from "@/components/filter/filter-search"
import { FilterSelect } from "@/components/filter/filter-select"
import { FilterToggleGroup } from "@/components/filter/filter-toggle-group"
import { Separator } from "@/components/ui/separator"

export interface TransactionFilterState {
  categories: string
  operation: string
  search: string
}

export type Preset = (typeof withCustom)[number]["key"]

interface TransactionFilterProps {
  filters: TransactionFilterState
  onFiltersChange: (filters: TransactionFilterState) => void
  preset: Preset
  onPresetChange: (preset: Preset) => void
  resolvedStartDate: Date
  resolvedEndDate: Date
  onCustomStartDateChange: (date: Date | undefined) => void
  onCustomEndDateChange: (date: Date | undefined) => void
}

export function TxFilter({
  filters,
  onFiltersChange,
  preset,
  onPresetChange,
  resolvedStartDate,
  resolvedEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: TransactionFilterProps) {
  const setFilter = <K extends keyof TransactionFilterState>(
    key: K,
    value: TransactionFilterState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const currentOps = categoryOps[filters.categories] ?? []
  const hasSingleOp = currentOps.length === 1

  return (
    <FieldGroup className="gap-4">
      <div className="flex w-full flex-col gap-4 md:flex-row md:items-center">
        <div className="w-full min-w-0 overflow-hidden border-b border-muted md:flex-1">
          <FilterToggleGroup
            value={filters.categories || "stock"}
            onValueChange={(v) => {
              if (v) {
                const ops = categoryOps[v] ?? []
                const nextOp = ops.length === 1 ? ops[0].key : "all"
                onFiltersChange({
                  ...filters,
                  categories: v,
                  operation: nextOp,
                })
              }
            }}
            options={txCategory}
          />
        </div>
        <div className="w-full flex-none md:w-auto md:pl-4">
          <FilterSelect
            placeholder="Operation"
            value={filters.operation === "all" ? null : filters.operation}
            onValueChange={(v) => setFilter("operation", v ?? "all")}
            allLabel="All operations"
            options={currentOps}
            disabled={hasSingleOp}
          />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 w-full">
        <FilterSearch
          placeholder="Search by memo…"
          value={filters.search}
          onCommit={(v) => setFilter("search", v)}
        />

        <Separator orientation="vertical" className="my-3 hidden xl:block" />
        <div className="flex flex-col md:flex-row w-full gap-4">
          <Field orientation="horizontal" className="md:max-w-60">
            <FieldLabel className="sr-only">Select time preset</FieldLabel>
            <Select
              value={preset}
              onValueChange={(value) => onPresetChange(value as Preset)}
            >
              <SelectTrigger className="w-full rounded-xl data-[size=default]:h-10 bg-background border border-muted">
                <Calendar />
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent position="popper">
                {withCustom.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DateRangePicker
            dateFrom={resolvedStartDate}
            dateTo={resolvedEndDate}
            onDateFromChange={onCustomStartDateChange}
            onDateToChange={onCustomEndDateChange}
            disabled={preset !== "CUSTOM"}
          />
        </div>
      </div>
    </FieldGroup>
  )
}
