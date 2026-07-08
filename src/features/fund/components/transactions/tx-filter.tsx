"use client"

import { useState } from "react"
import {
  Calendar,
  Tags,
  Repeat,
  FilePenLine,
  RotateCcw,
  Search,
  SearchIcon,
} from "lucide-react"
import { FilterSelect } from "@/components/filter/filter-select"
import { FilterToggleGroup } from "@/components/filter/filter-toggle-group"
import { DateRangePicker } from "@/components/date-picker"
import { txCategory, txOps, withCustom } from "@fund/config"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

export interface TransactionFilterState {
  categories: string | null
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

function SearchField({
  placeholder,
  value,
  onCommit,
}: {
  placeholder: string
  value: string
  onCommit: (value: string) => void
}) {
  const [searchInput, setSearchInput] = useState(value)

  const commitSearch = () => {
    onCommit(searchInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitSearch()
  }

  return (
    <Field orientation="horizontal">
      <FieldLabel className="sr-only">{placeholder}</FieldLabel>
      <ButtonGroup className="w-full">
        <InputGroup className="rounded-xl h-10 bg-background">
          <InputGroupInput
            placeholder={placeholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button
          variant="outline"
          size="lg"
          onClick={commitSearch}
          aria-label="Search"
        >
          Search
        </Button>
      </ButtonGroup>
    </Field>
  )
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
    filters.categories !== null ||
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
      categories: null,
      operation: null,
      search: "",
    })
  }

  return (
    <FieldGroup className="gap-5">
      <Field orientation="horizontal" className="border-b border-muted">
        <FieldLabel className="sr-only">Category</FieldLabel>
        <ToggleGroup
          type="single"
          value={filters.categories ?? undefined}
          onValueChange={(v) => setFilter("categories", v || null)}
          variant="default"
          spacing={2}
          className="w-full"
        >
          {txCategory.map((option) => {
            const OptionIcon = option.icon
            return (
              <ToggleGroupItem
                key={option.key}
                value={option.key}
                className="px-4 rounded-none data-[state=on]:bg-muted/0 data-[state=on]:border-foreground data-[state=on]:border-b hover:bg-muted/0 text-muted-foreground data-[state=on]:text-foreground"
              >
                <OptionIcon />
                {option.label}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </Field>

      <div className="flex flex-col xl:flex-row gap-4 w-full">
        <SearchField
          placeholder="Search by memo…"
          value={filters.search}
          onCommit={(v) => setFilter("search", v)}
        />

        <Separator orientation="vertical" className="my-3 hidden xl:block"/>

        <Field orientation="horizontal" className="xl:max-w-60">
          <FieldLabel className="sr-only">Select time preset</FieldLabel>
          <Select
            value={preset}
            onValueChange={(value) => onPresetChange(value as Preset)}
          >
            <SelectTrigger className="w-full rounded-xl data-[size=default]:h-10 bg-background border border-muted">
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
      </div>

      <FilterSelect
        icon={Repeat}
        placeholder="Operation"
        value={filters.operation}
        onValueChange={(v) => setFilter("operation", v)}
        allLabel="All Operations"
        groupLabel="Only transactions with..."
        options={txOps}
      />

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
  )
}
