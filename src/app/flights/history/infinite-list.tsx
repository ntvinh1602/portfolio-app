"use client"

import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"

interface InfiniteListProps {
  children: React.ReactNode
  hasMore: boolean
  isFetching: boolean
  isLoading: boolean
  count: number
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
  fetchNextPage,
  renderEndMessage,
  renderLoader,
  renderEmpty,
}: InfiniteListProps) {
  // Keep latest props in refs so the scroll handler always reads fresh values
  const hasMoreRef = useRef(hasMore)
  const isFetchingRef = useRef(isFetching)
  const fetchNextPageRef = useRef(fetchNextPage)

  hasMoreRef.current = hasMore
  isFetchingRef.current = isFetching
  fetchNextPageRef.current = fetchNextPage

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
    if (documentBottom <= window.innerHeight || scrollBottom >= documentBottom - 100) {
      fetchNextPage()
    }
  }, [isFetching, hasMore, fetchNextPage])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        {renderLoader?.() ?? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading flights...</p>
          </div>
        )}
      </div>
    )
  }

  if (!isFetching && count === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        {renderEmpty?.() ?? (
          <p className="text-sm text-muted-foreground">No flights found.</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {children}

      {/* Loading indicator */}
      {isFetching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
              All {count} flights loaded.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
