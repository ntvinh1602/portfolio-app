"use client"

import { Calendar, Coins, PiggyBank, Settings, ShoppingBag } from "lucide-react"
import { DateRangePicker } from "@/components/filter/date-picker"
import { FieldGroup } from "@/components/ui/field"
import { FilterSearch } from "@/components/filter/text-search"
import {
  SelectAllEnabled,
  SingleOptionSelect,
} from "@/components/filter/select-options"
import { FilterToggleGroup } from "@/components/filter/toggle-options"
import { Separator } from "@/components/ui/separator"
import {
  type LucideIcon,
  TrendingUp,
  TrendingDown,
  Upload,
  HandCoins,
  Handshake,
  Banknote,
  Box,
} from "lucide-react"

interface IconLabel {
  key: string
  label: string
  icon: LucideIcon
}
export interface TransactionFilterState {
  categories: string
  operation: string
  search: string
}

export const txOperations: Record<string, IconLabel[]> = {
  stock: [
    { key: "buy", label: "Buy", icon: ShoppingBag },
    { key: "sell", label: "Sell", icon: Coins },
  ],
  cashflow: [
    { key: "deposit", label: "Deposit", icon: PiggyBank },
    { key: "withdraw", label: "Withdraw", icon: Upload },
    { key: "income", label: "Income", icon: TrendingUp },
    { key: "expense", label: "Expense", icon: TrendingDown },
  ],
  borrow: [{ key: "borrow", label: "Borrow", icon: HandCoins }],
  repay: [{ key: "repay", label: "Repay", icon: Handshake }],
} as const

const txCategory: IconLabel[] = [
  { key: "stock", label: "Stock", icon: Box },
  { key: "cashflow", label: "Cashflow", icon: Banknote },
  { key: "borrow", label: "Borrow", icon: HandCoins },
  { key: "repay", label: "Repay", icon: Handshake },
] as const

const withCustom = [
  { key: "1M", label: "Last 1 months" },
  { key: "3M", label: "Last 3 months" },
  { key: "6M", label: "Last 6 months" },
  { key: "1Y", label: "Last 1 year" },
  { key: "CUSTOM", label: "Custom" },
] as const

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

  const currentOps = txOperations[filters.categories] ?? []
  const hasSingleOp = currentOps.length === 1

  return (
    <FieldGroup className="gap-4">
      <div className="flex w-full flex-col gap-4 md:flex-row md:items-center">
        <div className="w-full min-w-0 overflow-hidden border-b border-muted md:flex-1">
          <FilterToggleGroup
            value={filters.categories || "stock"}
            onValueChange={(v) => {
              if (v) {
                const ops = txOperations[v]
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
          <SelectAllEnabled
            icon={Settings}
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
          <SingleOptionSelect
            icon={Calendar}
            placeholder="Preset"
            value={preset}
            onValueChange={(v) => onPresetChange(v as Preset)}
            options={withCustom}
          />

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
