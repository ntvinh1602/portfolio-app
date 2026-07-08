"use client"

import { useTransactions } from "./context"
import { TxFilter } from "./tx-filter"

export function TransactionsFilterSection() {
  const {
    filters,
    setFilters,
    preset,
    setPreset,
    resolvedStartDate,
    resolvedEndDate,
    onCustomStartDateChange,
    onCustomEndDateChange,
  } = useTransactions()

  return (
    <TxFilter
      filters={filters}
      onFiltersChange={setFilters}
      preset={preset}
      onPresetChange={setPreset}
      resolvedStartDate={resolvedStartDate}
      resolvedEndDate={resolvedEndDate}
      onCustomStartDateChange={onCustomStartDateChange}
      onCustomEndDateChange={onCustomEndDateChange}
    />
  )
}
