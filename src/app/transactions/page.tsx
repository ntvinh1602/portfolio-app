"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { TransactionCard } from "@/components/transaction/tx-card"
import { TransactionSkeleton } from "@/components/transaction/tx-skeleton"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { type DateRange } from "react-day-picker"
import TabFilter from "@/components/tab-filter"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { TransactionForm } from "@/components/transaction/add-tx-form"
import { TransactionImportForm } from "@/components/transaction/import-form"
import {
  EllipsisVertical,
  PlusIcon,
  FileUp
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type TransactionFeed = {
  transaction_id: string
  transaction_date: string
  type: string
  description: string | null
  ticker: string
  name: string
  logo_url: string | null
  quantity: number
  amount: number
  currency_code: string
  net_sold?: number
}

const PAGE_SIZE = 6

export default function Page() {
  const [transactions, setTransactions] = React.useState<TransactionFeed[]>([])
  const [loading, setLoading] = React.useState(true)
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(true)
  const [assetType, setAssetType] = React.useState("stock")
  const tabOptions = [
    { value: "cash", label: "Cash" },
    { value: "stock", label: "Stock" },
    { value: "epf", label: "EPF" },
    { value: "crypto", label: "Crypto" },
  ]

  const fetchTransactions = React.useCallback(
    async (pageNumber: number, reset: boolean = false) => {
      setLoading(true)
      const { data, error } = await supabase.rpc("get_transaction_feed", {
        page_size: PAGE_SIZE,
        page_number: pageNumber,
        start_date: date?.from?.toISOString(),
        end_date: date?.to?.toISOString(),
        asset_class_filter: assetType,
      })

      if (error) {
        toast.error("Failed to fetch transaction feed: " + error.message)
        setTransactions([])
      } else {
        const fetchedTransactions = (data as TransactionFeed[]) || []
        setTransactions((prev) => {
          const newTransactions =
            pageNumber === 1 || reset
              ? fetchedTransactions
              : [...prev, ...fetchedTransactions]
          // Ensure uniqueness of transactions by ID
          const uniqueTransactions = Array.from(
            new Map(
              newTransactions.map((item) => [item.transaction_id, item]),
            ).values(),
          )
          return uniqueTransactions
        })
        setHasMore(fetchedTransactions.length === PAGE_SIZE)
      }
      setLoading(false)
    },
    [assetType, date],
  )

  React.useEffect(() => {
    setPage(1)
    fetchTransactions(1, true)
  }, [fetchTransactions])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTransactions(nextPage, false)
  }

  return (
    <PageMain>
      <PageHeader title="Transactions" />
      <PageContent>
        <div className="flex items-center justify-between">
          <DatePicker
            mode="range"
            selected={date}
            onSelect={setDate}
          />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default">
              Action<EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-border/50 rounded-2xl bg-card/25 backdrop-blur-sm"
          >
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <TransactionForm>
                <div className="flex items-center gap-2">
                  <PlusIcon />Add Transaction
                </div>
              </TransactionForm>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <TransactionImportForm>
                <div className="flex items-center gap-2">
                  <FileUp />Upload Data
                </div>
              </TransactionImportForm>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
        <TabFilter
          options={tabOptions}
          onValueChange={setAssetType}
          value={assetType}
          defaultValue="stock"
        />
        <div className="flex flex-col pt-2 gap-2">
          {loading && transactions.length === 0 ? (
            Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <TransactionSkeleton key={index} />
            ))
          ) : (
            transactions.map((tx) => (
              <TransactionCard
                key={tx.transaction_id}
                ticker={tx.ticker}
                name={tx.name}
                logoUrl={tx.logo_url || ""}
                amount={formatCurrency(
                  tx.type === "sell" && tx.net_sold ? tx.net_sold : tx.amount,
                )}
                quantity={formatCurrency(tx.quantity, tx.currency_code)}
                type={tx.type}
                description={tx.description || ""}
                currencyCode={tx.currency_code}
                transactionDate={tx.transaction_date}
              />
            ))
          )}
          {loading && transactions.length > 0 && <p className="text-center text-muted-foreground">Loading...</p>}
          {!loading && transactions.length === 0 && (
            <p className="mx-auto py-10">No transactions found</p>
          )}
          {!loading && hasMore && (
            <Button
              onClick={handleLoadMore}
              variant="outline"
              className="mx-auto mb-20"
            >
              Load more...
            </Button>
          )}
        </div>
      </PageContent>
    </PageMain>
  )
}
