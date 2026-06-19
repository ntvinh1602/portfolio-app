"use client"

import { useEffect, useRef } from "react"
import { FileXCorner } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"

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
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Spinner />
              </EmptyMedia>
              <EmptyTitle>Loading...</EmptyTitle>
              <EmptyDescription>
                Retrieving your data... Almost done!
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    )
  }

  if (!isFetching && count === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        {renderEmpty?.() ?? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileXCorner />
              </EmptyMedia>
              <EmptyTitle>No results found</EmptyTitle>
              <EmptyDescription>
                Unable to find any items matching the conditions.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
