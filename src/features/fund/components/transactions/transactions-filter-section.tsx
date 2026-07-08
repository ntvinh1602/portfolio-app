"use client"

import { useTransactionsData } from "./transactions-data-context"
import { TxFilter } from "./tx-filter"

export function TransactionsFilterSection() {
  const {
    state: { filters, preset, resolvedStartDate, resolvedEndDate },
    actions: {
      setFilters,
      setPreset,
      onCustomStartDateChange,
      onCustomEndDateChange,
    },
  } = useTransactionsData()

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
