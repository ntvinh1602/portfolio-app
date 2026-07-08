"use client"

import { useState } from "react"
import { Calendar, ChevronDown, MinusIcon, PlusIcon } from "lucide-react"
import { DateRangePicker } from "@/components/date-picker"
import { txCategory, categoryOps, withCustom } from "@fund/config"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { FilterSearch } from "@/components/filter/filter-search"
import { FilterToggleGroup } from "@/components/filter/filter-toggle-group"
import { Separator } from "@/components/ui/separator"

export interface TransactionFilterState {
  categories: string
  operation: string[]
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
  const allSelected =
    currentOps.length > 0 &&
    currentOps.every((op) => filters.operation.includes(op.key))

  const [draftOps, setDraftOps] = useState(filters.operation)

  return (
    <FieldGroup className="gap-4">
      <div className="flex w-full flex-col gap-4 md:flex-row md:items-center">
        <div className="w-full min-w-0 overflow-hidden border-b border-muted md:flex-1">
          <FilterToggleGroup
            value={filters.categories || "stock"}
            onValueChange={(v) => {
              if (v) {
                const nextOps = (categoryOps[v] ?? []).map((op) => op.key)
                onFiltersChange({
                  ...filters,
                  categories: v,
                  operation: nextOps,
                })
              }
            }}
            options={txCategory}
          />
        </div>
        <div className="w-full flex-none md:w-auto md:pl-4">
          <Field orientation="horizontal" className="w-full md:w-auto">
            <FieldLabel className="sr-only">Operations</FieldLabel>
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) {
                  setDraftOps(filters.operation)
                } else {
                  setFilter("operation", draftOps)
                }
              }}
            >
              <DropdownMenuTrigger
                className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-muted bg-background px-3 text-sm md:w-44 [&[data-state=open]]:border-foreground/20"
                disabled={currentOps.length <= 1}
              >
                <span className="truncate">
                  {allSelected
                    ? "All operations"
                    : `${filters.operation.length} operation${filters.operation.length !== 1 ? "s" : ""}`}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[var(--dropdown-menu-trigger-width)]"
              >
                {currentOps.map((option) => {
                  const OptionIcon = option.icon
                  const checked = draftOps.includes(option.key)
                  return (
                    <DropdownMenuCheckboxItem
                      key={option.key}
                      checked={checked}
                      onSelect={(e) => {
                        e.preventDefault()
                        setDraftOps(
                          checked
                            ? draftOps.filter((k) => k !== option.key)
                            : [...draftOps, option.key],
                        )
                      }}
                    >
                      <OptionIcon className="size-3.5" />
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  )
                })}
                {currentOps.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>
                      Shortcuts
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setDraftOps(currentOps.map((op) => op.key))
                      }}
                      className="justify-between"
                    >
                      Select all
                      <PlusIcon />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setDraftOps([])
                      }}
                      className="justify-between"
                    >
                      Remove all
                      <MinusIcon />
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </Field>
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
