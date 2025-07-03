"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import {
  TransactionCard,
  TransactionSkeleton
} from "@/components/transaction/transaction-layout"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { type DateRange } from "react-day-picker"
import TabFilter from "@/components/tab-filter"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { TransactionForm } from "@/components/transaction/add-transaction"
import { TransactionImportForm } from "@/components/transaction/import-form"
import {
  SquarePen,
  PlusIcon,
  Upload,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuSub } from "@radix-ui/react-dropdown-menu"
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedTransactionType, setSelectedTransactionType] =
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

  const handleMenuItemClick = (type: Enums<"transaction_type">) => {
    setSelectedTransactionType(type)
    setIsDialogOpen(true)
  }

  return (
    <PageMain>
      <PageHeader title="Transactions" />
      <PageContent>
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <PlusIcon />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="rounded-2xl bg-card/25 backdrop-blur-sm"
            >
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <SquarePen />
                  Manual Input
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("buy")}
                    >
                      Buy
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("sell")}
                    >
                      Sell
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("deposit")}
                    >
                      Deposit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("withdraw")}
                    >
                      Withdraw
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("income")}
                    >
                      Income
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("expense")}
                    >
                      Expense
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("borrow")}
                    >
                      Borrow
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("debt_payment")}
                    >
                      Debt Payment
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("dividend")}
                    >
                      Dividend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => handleMenuItemClick("split")}
                    >
                      Split
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={e => e.preventDefault()}>
                <TransactionImportForm>
                  <div className="flex items-center gap-2">
                    <Upload />
                    Batch Upload
                  </div>
                </TransactionImportForm>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <TransactionForm
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            transactionType={selectedTransactionType}
          />
          <DatePicker mode="range" selected={date} onSelect={setDate} />
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
            transactions.map(tx => (
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
          {loading && transactions.length > 0 && (
            <p className="text-center text-muted-foreground">Loading...</p>
          )}
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
