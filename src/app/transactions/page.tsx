"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
  BottomNavBar
} from "@/components/page-layout"
import {
  TransactionCard,
  TransactionSkeleton
} from "@/components/list-item/transaction"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
import { type DateRange } from "react-day-picker"
import TabSwitcher from "@/components/tab-switcher"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Enums } from "@/lib/database.types"

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
    React.useState<Enums<"transaction_type">>("deposit")
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
        setTransactions(prev => {
          const newTransactions =
            pageNumber === 1 || reset
              ? fetchedTransactions
              : [...prev, ...fetchedTransactions]
          // Ensure uniqueness of transactions by ID
          const uniqueTransactions = Array.from(
            new Map(
              newTransactions.map(item => [item.transaction_id, item]),
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
          <DatePicker mode="range" selected={date} onSelect={setDate} />
        </div>
        <TabSwitcher
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
            transactions.map(tx => (
              <TransactionCard
                key={tx.transaction_id}
                ticker={tx.ticker}
                name={tx.name}
                logoUrl={tx.logo_url || ""}
                amount={tx.amount}
                quantity={tx.quantity}
                type={tx.type}
                description={tx.description || ""}
                currencyCode={tx.currency_code}
                date={tx.transaction_date}
              />
            ))
          )}
          {loading && transactions.length > 0 && (
            <p className="text-center text-muted-foreground">Loading...</p>
          )}
          {!loading && transactions.length === 0 && (
            <p className="mx-auto font-thin py-10">No transactions found</p>
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
      <BottomNavBar />
    </PageMain>
  )
}
