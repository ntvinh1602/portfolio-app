"use client"

import { useState, useEffect } from "react"
import { Calendar, Tags, Repeat, FilePenLine } from "lucide-react"
import { FilterCard } from "@/components/filter/filter-card"
import { FilterSelect } from "@/components/filter/filter-select"
import { FilterToggleGroup } from "@/components/filter/filter-toggle-group"
import { FilterSearch } from "@/components/filter/filter-search"
import { DateRangePicker } from "@/components/date-picker"
import { txCategory, txOps, withCustom } from "@fund/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel } from "@/components/ui/field"

export interface TransactionFilterState {
  categories: string[]
  operation: string | null
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

  return (
    <FilterCard hasFilters={hasFilters} onReset={resetFilters}>
      <Field orientation="horizontal">
        <FieldLabel>
          <Calendar className="stroke-1 size-5" />
        </FieldLabel>
        <Select
          value={preset}
          onValueChange={(value) => onPresetChange(value as Preset)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Preset" />
          </SelectTrigger>
          <SelectContent>
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

      <FilterToggleGroup
        icon={Tags}
        value={filters.categories}
        onValueChange={(v) => setFilter("categories", v)}
        options={txCategory}
      />

      <FilterSelect
        icon={Repeat}
        placeholder="Operation"
        value={filters.operation}
        onValueChange={(v) => setFilter("operation", v)}
        allLabel="All Operations"
        groupLabel="Only transactions with..."
        options={txOps}
      />

      <FilterSearch
        icon={FilePenLine}
        placeholder="Search by memo…"
        value={filters.search}
        onCommit={(v) => setFilter("search", v)}
      />
    </FilterCard>
  )
}
