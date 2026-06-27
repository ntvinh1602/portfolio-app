"use client"

import { useState, useEffect } from "react"
import {
  Search,
  RotateCcw,
  Funnel,
  Calendar,
  Tags,
  Repeat,
  FilePenLine,
} from "lucide-react"
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
import { DatePicker } from "@/components/date-picker"
import { txCategory, txOps } from "@fund/config"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

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
    <Card className="h-fit w-full xl:max-w-90 mx-auto">
      <CardHeader>
        <CardTitle>Filter</CardTitle>
        <CardAction>
          <Funnel className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-5">
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
                <SelectItem value="1M">Last 1 month</SelectItem>
                <SelectItem value="3M">Last 3 months</SelectItem>
                <SelectItem value="6M">Last 6 months</SelectItem>
                <SelectItem value="1Y">Last 1 year</SelectItem>
                <SelectItem value="CUSTOM">Custom...</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DatePicker
            dateFrom={resolvedStartDate}
            dateTo={resolvedEndDate}
            onDateFromChange={onCustomStartDateChange}
            onDateToChange={onCustomEndDateChange}
            disabled={preset !== "CUSTOM"}
          />
          
          <Field orientation="horizontal">
            <FieldLabel>
              <Tags className="stroke-1 size-5" />
            </FieldLabel>
            <ToggleGroup
              type="multiple"
              value={filters.categories}
              onValueChange={(v) => setFilter("categories", v)}
              variant="outline"
              spacing={0}
              className="w-full"
            >
              {txCategory.map((c) => {
                const Icon = c.icon
                return (
                  <ToggleGroupItem
                    key={c.value}
                    value={c.value}
                    className="rounded-xl px-3 text-xs flex-1"
                  >
                    <Icon className="size-3.5" />
                    {c.label}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel>
              <Repeat className="stroke-1 size-5" />
            </FieldLabel>
            <Select
              value={filters.operation ?? "all"}
              onValueChange={(v) =>
                setFilter("operation", v === "all" ? null : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Operation" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All Operations</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Only transactions with...</SelectLabel>
                  {txOps.map((o) => {
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
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          
          <Field orientation="horizontal">
            <FieldLabel>
              <FilePenLine className="stroke-1 size-5" />
            </FieldLabel>
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
