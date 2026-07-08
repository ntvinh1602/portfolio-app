"use client"

import { createContext, useState, use } from "react"
import { useTransactionFilters } from "@fund/hooks/use-transaction-filters"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import type { Tables, Enums } from "@/types/database.types"
import { StockForm } from "@fund/form/stockForm"
import { CashflowForm } from "@fund/form/cashflowForm"
import { BorrowForm } from "@fund/form/borrowForm"
import { RepayForm } from "@fund/form/repayForm"

type TransactionFormType = Enums<"tx_category">
type Transaction = {
  [K in keyof Tables<"tx_summary">]: NonNullable<Tables<"tx_summary">[K]>
}

const formConfig: Record<
  TransactionFormType,
  {
    title: string
    subtitle?: string
    Component: React.ComponentType<{
      onSuccess?: () => void
      formId: string
      onLoadingChange: (loading: boolean) => void
      resetFormRef: { current: () => void }
    }>
  }
> = {
  stock: {
    title: "Add Stock Trades",
    subtitle: "Record sales or acquisition of stocks",
    Component: StockForm,
  },
  cashflow: {
    title: "Add Cashflow Events",
    subtitle: "Record cash assets transactions",
    Component: CashflowForm,
  },
  borrow: {
    title: "Add Debts",
    subtitle: "Record a new debt",
    Component: BorrowForm,
  },
  repay: {
    title: "Add Repayment",
    subtitle: "Record a debt settlement",
    Component: RepayForm,
  },
}

interface TransactionsContextValue {
  data: Transaction[]
  count: number | undefined
  isSuccess: boolean
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  hasMore: boolean
  fetchNextPage: () => void
  open: boolean
  setOpen: (open: boolean) => void
  activeForm: TransactionFormType | null
  handleOpenForm: (type: TransactionFormType) => void
  currentConfig: (typeof formConfig)[TransactionFormType] | null
  triggerRefresh: () => void
  preset: ReturnType<typeof useTransactionFilters>["preset"]
  setPreset: ReturnType<typeof useTransactionFilters>["setPreset"]
  resolvedStartDate: Date
  resolvedEndDate: Date
  onCustomStartDateChange: (date: Date | undefined) => void
  onCustomEndDateChange: (date: Date | undefined) => void
  filters: ReturnType<typeof useTransactionFilters>["filters"]
  setFilters: ReturnType<typeof useTransactionFilters>["setFilters"]
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({
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

  const [open, setOpen] = useState(false)
  const [activeForm, setActiveForm] = useState<TransactionFormType | null>(null)

  const handleOpenForm = (type: TransactionFormType) => {
    setActiveForm(type)
    setOpen(true)
  }

  const currentConfig = activeForm ? formConfig[activeForm] : null

  return (
    <TransactionsContext.Provider
      value={{
        data: transactions,
        count,
        isSuccess,
        isLoading,
        isFetching,
        error,
        hasMore,
        fetchNextPage,
        open,
        setOpen,
        activeForm,
        handleOpenForm,
        currentConfig,
        triggerRefresh,
        preset,
        setPreset,
        resolvedStartDate,
        resolvedEndDate,
        onCustomStartDateChange,
        onCustomEndDateChange,
        filters,
        setFilters,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactions() {
  const ctx = use(TransactionsContext)
  if (!ctx) {
    throw new Error(
      "useTransactions must be used within TransactionsProvider",
    )
  }
  return ctx
}
