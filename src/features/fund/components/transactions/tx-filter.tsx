"use client"

import { useState } from "react"
import { Calendar, SearchIcon } from "lucide-react"
import { DateRangePicker } from "@/components/date-picker"
import { txCategory, txOps, withCustom } from "@fund/config"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

export interface TransactionFilterState {
  categories: string
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
  const setFilter = <K extends keyof TransactionFilterState>(
    key: K,
    value: TransactionFilterState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <FieldGroup className="gap-4">
      <div className="flex w-full flex-col gap-4 md:flex-row md:items-center">
        <div className="w-full min-w-0 overflow-hidden border-b border-muted md:flex-1">
          <Field orientation="horizontal" className="w-full">
            <FieldLabel className="sr-only">Category</FieldLabel>
            <ToggleGroup
              type="single"
              value={filters.categories || "stock"}
              onValueChange={(v) => {
                if (v) setFilter("categories", v)
              }}
              variant="default"
              spacing={2}
              className="flex w-full justify-start overflow-x-auto md:inline-flex md:w-fit md:max-w-full"
            >
              {txCategory.map((option) => {
                const OptionIcon = option.icon
                return (
                  <ToggleGroupItem
                    key={option.key}
                    value={option.key}
                    className="flex-1 px-4 rounded-none data-[state=on]:bg-muted/0 data-[state=on]:border-foreground data-[state=on]:border-b hover:bg-muted/0 text-muted-foreground data-[state=on]:text-foreground md:flex-none"
                  >
                    <OptionIcon />
                    {option.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </Field>
        </div>
        <div className="w-full flex-none md:w-auto md:pl-4">
          <Field orientation="horizontal" className="w-full md:w-auto">
            <FieldLabel className="sr-only">Operations</FieldLabel>
            <Select
              value={filters.operation ?? "all"}
              onValueChange={(v) => setFilter("operation", v)}
            >
              <SelectTrigger className="w-full bg-background border border-muted data-[size=default]:h-10 md:w-40">
                <SelectValue placeholder="Operation" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All Operations</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Only transactions with...</SelectLabel>
                  {txOps.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.icon ? (
                        <span className="flex items-center gap-2">
                          <option.icon className="size-3.5" />
                          {option.label}
                        </span>
                      ) : (
                        option.label
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 w-full">
        <SearchField
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
      </div>
    </FieldGroup>
  )
}
