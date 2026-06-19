"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { subMonths } from "date-fns"
import { startOfDay, endOfDay } from "date-fns"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import { InfiniteList } from "@/components/infinite-list"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import { TransactionCard, type Transaction } from "./transaction-card"
import {
  TransactionFilter,
  type TransactionFilterState,
  type Preset,
} from "./transaction-filter"
import { StockForm } from "./form/stockForm"
import { CashflowForm } from "./form/cashflowForm"
import { BorrowForm } from "./form/borrowForm"
import { RepayForm } from "./form/repayForm"
import { PlusIcon, ListFilter } from "lucide-react"

type TransactionFormType = "stock" | "cashflow" | "borrow" | "repay"

function getDateRangeFromPreset(preset: Preset, now: Date) {
  switch (preset) {
    case "1M":
      return { startDate: subMonths(now, 1), endDate: now }
    case "3M":
      return { startDate: subMonths(now, 3), endDate: now }
    case "6M":
      return { startDate: subMonths(now, 6), endDate: now }
    case "1Y":
      return { startDate: subMonths(now, 12), endDate: now }
    default:
      return { startDate: subMonths(now, 3), endDate: now }
  }
}

const formConfig: Record<
  TransactionFormType,
  { title: string; subtitle?: string; Component: React.ComponentType<{ onSuccess?: () => void }> }
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

export default function TransactionsPage() {
  const defaultPreset: Preset = "3M"

  // Defer Date.now()/new Date() to useEffect — cacheComponents requires
  // deterministic values during server render.
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()) }, [])

  const [preset, setPreset] = useState<Preset>(defaultPreset)
  const [customRange, setCustomRange] = useState<{
    startDate: Date; endDate: Date
  } | null>(null)
  const [filters, setFilters] = useState<TransactionFilterState>({
    categories: [],
    operation: null,
    search: "",
  })
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Once the client clock is available, initialise the date range
  useEffect(() => {
    if (now && !customRange) {
      setCustomRange(getDateRangeFromPreset(defaultPreset, now))
    }
  }, [now, customRange])

  // Fallback range used during SSR — the real range kicks in after hydration
  // and the useInfiniteQuery store is recreated via trailingQueryKey change.
  const fallbackRange = { startDate: new Date(0), endDate: new Date(0) }
  const dateRange = useMemo(() => {
    if (!customRange) return fallbackRange
    if (preset === "CUSTOM") return customRange
    return getDateRangeFromPreset(preset, now ?? new Date())
  }, [preset, customRange, now])

  const startISO = useMemo(
    () => startOfDay(dateRange.startDate).toISOString(),
    [dateRange.startDate]
  )
  const endISO = useMemo(
    () => endOfDay(dateRange.endDate).toISOString(),
    [dateRange.endDate]
  )

  // Build a trailing query that applies date range and all active filters
  const trailingQuery = useCallback(
    (query: any) => {
      query = query
        .gte("created_at", startISO)
        .lte("created_at", endISO)

      if (filters.categories.length > 0) {
        query = query.in("category", filters.categories)
      }
      if (filters.operation) {
        query = query.eq("operation", filters.operation)
      }
      if (filters.search) {
        query = query.ilike("memo", `%${filters.search}%`)
      }

      return query.order("created_at", { ascending: false })
    },
    [startISO, endISO, filters]
  )

  // When the trailing query shape changes, the store is recreated
  const trailingQueryKey = useMemo(
    () =>
      JSON.stringify({
        startISO,
        endISO,
        categories: filters.categories,
        operation: filters.operation,
        search: filters.search,
        refreshCounter,
      }),
    [startISO, endISO, filters, refreshCounter]
  )

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
    tableName: "tx_summary" as any,
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
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="flex flex-col xl:flex-row gap-4 px-4 mx-auto">

        {/* Filter card */}
        <Card className="h-fit w-fit mx-auto">
          <CardHeader>
            <CardTitle>Filter</CardTitle>
            <CardAction>
              <ListFilter className="stroke-1" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <TransactionFilter
              filters={filters}
              onFiltersChange={setFilters}
              preset={preset}
              onPresetChange={setPreset}
              customStartDate={customRange?.startDate ?? new Date(0)}
              customEndDate={customRange?.endDate ?? new Date(0)}
              onCustomStartDateChange={(date) =>
                setCustomRange((prev) => {
                  const base = prev ?? { startDate: new Date(0), endDate: new Date(0) }
                  return { ...base, startDate: date ?? base.startDate }
                })
              }
              onCustomEndDateChange={(date) =>
                setCustomRange((prev) => {
                  const base = prev ?? { startDate: new Date(0), endDate: new Date(0) }
                  return { ...base, endDate: date ?? base.endDate }
                })
              }
            />
          </CardContent>
        </Card>

        {/* Transaction list card */}
        <Card className="sm:min-w-120">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {isSuccess
                ? `${count} transaction${count !== 1 ? "s" : ""} found`
                : "Loading..."}
            </CardDescription>
            <CardAction>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-2xl">
                    <PlusIcon />
                    Transaction
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem onClick={() => handleOpenForm("stock")}>
                    Stock Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenForm("cashflow")}>
                    Cashflow Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenForm("borrow")}>
                    Borrow Event
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenForm("repay")}>
                    Repay Event
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {currentConfig && (
                <FormDialogWrapper
                  open={open}
                  onOpenChange={(value) => {
                    setOpen(value)
                    if (!value) setActiveForm(null)
                  }}
                  title={currentConfig.title}
                  subtitle={currentConfig.subtitle}
                  FormComponent={currentConfig.Component}
                  onSuccess={() => setRefreshCounter((c) => c + 1)}
                />
              )}
            </CardAction>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Error banner */}
              {error && (
                <div className="text-sm text-red-500">
                  Error fetching transactions: {error.message}
                </div>
              )}

              {/* Infinite card list */}
              <InfiniteList
                hasMore={hasMore}
                isFetching={isFetching}
                isLoading={isLoading}
                count={count}
                fetchNextPage={fetchNextPage}
              >
                {transactions.length > 0 && (
                  <div
                    className="flex flex-col gap-2"
                    style={{ contentVisibility: "auto", containIntrinsicSize: "auto 500px" } as React.CSSProperties}
                  >
                    {transactions.map((tx) => (
                      <TransactionCard key={tx.id} transaction={tx} />
                    ))}
                  </div>
                )}
              </InfiniteList>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
