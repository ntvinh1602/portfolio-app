"use client"

import { useEffect, useRef } from "react"
import { Spinner } from "@/components/ui/spinner"
import StatusLabel from "./status-label"

interface InfiniteListProps {
  children: React.ReactNode
  hasMore: boolean
  isFetching: boolean
  isLoading: boolean
  count: number
  error?: Error | null
  fetchNextPage: () => void
  renderEndMessage?: (count: number) => React.ReactNode
  renderLoader?: () => React.ReactNode
  renderEmpty?: () => React.ReactNode
}

export function InfiniteList({
  children,
  hasMore,
  isFetching,
  isLoading,
  count,
  error,
  fetchNextPage,
  renderEndMessage,
  renderLoader,
  renderEmpty,
}: InfiniteListProps) {
  // Keep latest props in refs so the scroll handler always reads fresh values
  const hasMoreRef = useRef(hasMore)
  const isFetchingRef = useRef(isFetching)
  const fetchNextPageRef = useRef(fetchNextPage)

  // Sync refs with latest props so the scroll handler reads fresh values
  useEffect(() => {
    hasMoreRef.current = hasMore
    isFetchingRef.current = isFetching
    fetchNextPageRef.current = fetchNextPage
  })

  // Scroll-based infinite loading — simpler and more reliable than
  // IntersectionObserver, which can miss events when isFetching toggles
  // while the sentinel is already in view.
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreRef.current || isFetchingRef.current) return

      // Trigger when within 300px of the bottom of the document
      const scrollBottom = window.scrollY + window.innerHeight
      const documentBottom = document.documentElement.scrollHeight

      if (scrollBottom >= documentBottom - 300) {
        fetchNextPageRef.current()
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // After a fetch completes, check if the page still isn't filled — if
  // the document is short enough that no scrollbar exists, the scroll
  // event will never fire and we need to trigger the next page manually.
  useEffect(() => {
    if (isFetching || !hasMore) return

    const scrollBottom = window.scrollY + window.innerHeight
    const documentBottom = document.documentElement.scrollHeight

    // Page doesn't fill the viewport — load more immediately
    if (
      documentBottom <= window.innerHeight ||
      scrollBottom >= documentBottom - 100
    ) {
      fetchNextPage()
    }
  }, [isFetching, hasMore, fetchNextPage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full min-w-80">
        {renderLoader?.() ?? <StatusLabel type="loading" />}
      </div>
    )
  }

  // Gate on !error: a failed first fetch sets both error and count=0,
  // so we'd otherwise render the error banner AND the empty state together.
  if (!isFetching && count === 0 && !error) {
    return (
      <div className="flex items-center justify-center min-w-80">
        {renderEmpty?.() ?? <StatusLabel type="empty" />}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {children}

      {/* Loading indicator */}
      {isFetching && (
        <div className="flex items-center justify-center py-8">
          <Spinner />
          <span className="ml-2 text-sm text-muted-foreground">
            Loading more...
          </span>
        </div>
      )}

      {/* End of list message */}
      {!hasMore && count > 0 && (
        <div className="py-8 text-center">
          {renderEndMessage?.(count) ?? (
            <p className="text-sm text-muted-foreground">
              All {count} items loaded.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
