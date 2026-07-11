"use client"

import { InfiniteList } from "@/components/infinite-list"
import { TxnItem } from "../ui/tx-item"
import { ItemGroup, ItemTitle } from "@/components/ui/item"
import StatusLabel from "@/components/status-label"
import { useTransactionsData } from "./transactions-data-context"

export function TransactionsListSection() {
  const {
    state: { data, count, isLoading, isFetching, error, hasMore },
    actions: { fetchNextPage },
  } = useTransactionsData()

  if (error) return <StatusLabel type="error" />

  return (
    <InfiniteList
      hasMore={hasMore}
      isFetching={isFetching}
      isLoading={isLoading}
      count={count ?? 0}
      error={error}
      fetchNextPage={fetchNextPage}
    >
      {data.length > 0 && (
        <ItemGroup className="gap-2">
          <ItemTitle className="pb-2">Found {data.length} transactions</ItemTitle>
          {data.map((tx) => (
            <TxnItem key={tx.id} tx={tx} />
          ))}
        </ItemGroup>
      )}
    </InfiniteList>
  )
}
