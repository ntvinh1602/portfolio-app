"use client"

import { createContext, use } from "react"
import { useTransactionFilters } from "@fund/hooks/use-transaction-filters"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import type { Tables } from "@/types/database.types"

type Transaction = {
  [K in keyof Tables<"tx_summary">]: NonNullable<Tables<"tx_summary">[K]>
}

interface TransactionsDataContextValue {
  state: {
    data: Transaction[]
    count: number | undefined
    isSuccess: boolean
    isLoading: boolean
    isFetching: boolean
    error: Error | null
    hasMore: boolean
    filters: ReturnType<typeof useTransactionFilters>["filters"]
    preset: ReturnType<typeof useTransactionFilters>["preset"]
    resolvedStartDate: Date
    resolvedEndDate: Date
  }
  actions: {
    fetchNextPage: () => void
    setFilters: ReturnType<typeof useTransactionFilters>["setFilters"]
    setPreset: ReturnType<typeof useTransactionFilters>["setPreset"]
    onCustomStartDateChange: (date: Date | undefined) => void
    onCustomEndDateChange: (date: Date | undefined) => void
    triggerRefresh: () => void
  }
  meta: {
    trailingQueryKey: string
  }
}

const TransactionsDataContext = createContext<TransactionsDataContextValue | null>(
  null,
)

export function TransactionsDataProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    preset,
    setPreset,
    resolvedStartDate,
    resolvedEndDate,
    onCustomStartDateChange,
    onCustomEndDateChange,
    filters,
    setFilters,
    trailingQuery,
    trailingQueryKey,
    triggerRefresh,
  } = useTransactionFilters()

  const {
    data: transactions,
    count,
    isSuccess,
    isLoading,
    isFetching,
    error,
    hasMore,
    fetchNextPage,
  } = useInfiniteQuery<Transaction>({
    tableName: "tx_summary",
    columns: "*",
    pageSize: 12,
    trailingQuery,
    trailingQueryKey,
  })

  return (
    <TransactionsDataContext.Provider
      value={{
        state: {
          data: transactions,
          count,
          isSuccess,
          isLoading,
          isFetching,
          error,
          hasMore,
          filters,
          preset,
          resolvedStartDate,
          resolvedEndDate,
        },
        actions: {
          fetchNextPage,
          setFilters,
          setPreset,
          onCustomStartDateChange,
          onCustomEndDateChange,
          triggerRefresh,
        },
        meta: {
          trailingQueryKey,
        },
      }}
    >
      {children}
    </TransactionsDataContext.Provider>
  )
}

export function useTransactionsData() {
  const ctx = use(TransactionsDataContext)
  if (!ctx) {
    throw new Error(
      "useTransactionsData must be used within TransactionsDataProvider",
    )
  }
  return ctx
}
