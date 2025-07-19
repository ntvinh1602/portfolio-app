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
} from "@/components/list-item/transaction"
import { type DateRange } from "react-day-picker"
import TabSwitcher from "@/components/tab-switcher"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import useSWRInfinite from "swr/infinite"
import { fetcher } from "@/lib/fetcher"

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
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)
  const [assetType, setAssetType] = React.useState("stock")

  const getKey = (pageIndex: number, previousPageData: TransactionFeed[] | null) => {
    if (previousPageData && !previousPageData.length) return null // reached the end
    
    const params = new URLSearchParams({
      page_size: PAGE_SIZE.toString(),
      page_number: (pageIndex + 1).toString(),
      asset_class_filter: assetType,
    });

    if (date?.from) params.append("start_date", date.from.toISOString());
    if (date?.to) params.append("end_date", date.to.toISOString());

    return `/api/query/transaction-feed?${params.toString()}`
  }

  const { data, size, setSize, isLoading } = useSWRInfinite<TransactionFeed[]>(getKey, fetcher);

  const transactions = data ? ([] as TransactionFeed[]).concat(...data) : [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.length === 0;
  const hasMore = !isEmpty && (data?.[data.length - 1]?.length ?? 0) === PAGE_SIZE;

  const tabOptions = [
    { value: "cash", label: "Cash" },
    { value: "stock", label: "Stock" },
    { value: "epf", label: "EPF" },
    { value: "crypto", label: "Crypto" },
  ]

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
          {isLoading && !data &&
            Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <TransactionSkeleton key={index} />
            ))}
          {transactions.map(tx => (
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
          ))}
          {isLoadingMore &&
            Array.from({ length: 3 }).map((_, index) => (
              <TransactionSkeleton key={`loading-${index}`} />
            ))}
          {isEmpty && <p className="mx-auto font-thin py-10">No transactions found</p>}
          {hasMore && !isLoadingMore && (
            <Button
              onClick={() => setSize(size + 1)}
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
