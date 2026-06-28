"use client"

import { useState } from "react"
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
import { FormDialogWrapper } from "@/components/form/form-wrapper"
import { InfiniteList } from "@/components/infinite-list"
import { useInfiniteQuery } from "@/hooks/use-infinite-query"
import { TxnItem } from "./tx-item"
import type { Tables } from "@/types/database.types"
import { TxFilter } from "./tx-filter"
import { StockForm } from "@fund/form/stockForm"
import { CashflowForm } from "@fund/form/cashflowForm"
import { BorrowForm } from "@fund/form/borrowForm"
import { RepayForm } from "@fund/form/repayForm"
import { PlusIcon } from "lucide-react"
import { ItemGroup } from "@/components/ui/item"
import { useTransactionFilters } from "@fund/hooks/use-transaction-filters"
import StatusLabel from "@/components/status-label"

type TransactionFormType = "stock" | "cashflow" | "borrow" | "repay"
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

export default function TransactionsClient() {
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
    <div className="@container/main flex flex-1 flex-col ">
      <div className="flex flex-col w-full xl:flex-row xl:max-w-250 gap-4 px-4 mx-auto">
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

        <Card className="w-full">
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
                    Add Event
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
                  onSuccess={triggerRefresh}
                />
              )}
            </CardAction>
          </CardHeader>

          <CardContent>
            {error ? (
              <StatusLabel type="error" />
            ) : (
              <InfiniteList
                hasMore={hasMore}
                isFetching={isFetching}
                isLoading={isLoading}
                count={count}
                error={error}
                fetchNextPage={fetchNextPage}
              >
                {transactions.length > 0 && (
                  <div className="grid gap-2 [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
                    <ItemGroup>
                      {transactions.map((tx) => (
                        <TxnItem key={tx.id} transaction={tx} />
                      ))}
                    </ItemGroup>
                  </div>
                )}
              </InfiniteList>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
