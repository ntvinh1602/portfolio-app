"use client"

import { InfiniteList } from "@/components/infinite-list"
import { TxnItem } from "./tx-item"
import { ItemGroup } from "@/components/ui/item"
import StatusLabel from "@/components/status-label"
import { useTransactions } from "./context"

export function TransactionsListSection() {
  const {
    data,
    count,
    isSuccess,
    isLoading,
    isFetching,
    error,
    hasMore,
    fetchNextPage,
  } = useTransactions()

  return (
    <>
      {error ? (
        <StatusLabel type="error" />
      ) : (
        <InfiniteList
          hasMore={hasMore}
          isFetching={isFetching}
          isLoading={isLoading}
          count={count ?? 0}
          error={error}
          fetchNextPage={fetchNextPage}
        >
          {data.length > 0 && (
            <div className="grid gap-2 [content-visibility:auto] [contain-intrinsic-size:auto_500px]">
              <ItemGroup>
                <span>
                  Found {data.length} transactions
                </span>
                {data.map((tx) => (
                  <TxnItem key={tx.id} transaction={tx} />
                ))}
              </ItemGroup>
            </div>
          )}
        </InfiniteList>
      )}
    </>
  )
}
