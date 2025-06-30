"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SiteHeader } from "@/components/site-header"
import { TransactionCard } from "@/components/transaction-card"
import { TransactionSkeleton } from "@/components/transaction-skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { type DateRange } from "react-day-picker"
import { Card } from "@/components/ui/card"
import TabFilter from "@/components/tab-filter"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { TransactionForm } from "@/components/transaction-form"
import { PlusIcon } from "lucide-react"

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

  const fetchTransactions = async (pageNumber: number, reset: boolean = false) => {
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
  }

  React.useEffect(() => {
    setPage(1)
    fetchTransactions(1, true)
  }, [date, assetType])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchTransactions(nextPage, false)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Transactions" />
        <Card className="bg-background shadow-none border-none gap-4 px-6 py-2 w-full max-w-4xl xl:mx-auto">
          <div className="flex items-center justify-between">
            <DatePicker
              mode="range"
              selected={date}
              onSelect={setDate}
            />
            <TransactionForm>
              <Button variant="default" className="rounded-full">
                <PlusIcon className="size-4" />
                Transaction
              </Button>
            </TransactionForm>
          </div>
          <div className="flex items-center justify-between">
            <TabFilter
              options={tabOptions}
              onValueChange={setAssetType}
              value={assetType}
              defaultValue="stock"
            />
          </div>
          <div className="flex flex-col gap-2 max-w-4xl xl:mx-auto w-full">
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
                  amount={formatCurrency(tx.amount)}
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
                className="w-fit mx-auto rounded-full bg-muted text-muted-foreground border-none mb-40"
              >
                Load more...
              </Button>
            )}
          </div>
        </Card>
      </SidebarInset>
    </SidebarProvider>
  )
}
