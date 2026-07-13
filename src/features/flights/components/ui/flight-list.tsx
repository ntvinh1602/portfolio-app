"use client"

import { Accordion } from "@/components/ui/accordion"
import { InfiniteList } from "@/components/infinite-list"
import { ItemGroup, ItemTitle } from "@/components/ui/item"
import { FlightItem } from "./flight-item"
import type { Flight } from "./flight-config"

const renderEndMessage = (total: number) => (
  <p className="text-sm text-muted-foreground">
    You have reached the end — all {total} flights loaded.
  </p>
)

interface FlightListProps {
  data: Flight[]
  count: number
  isLoading: boolean
  isFetching: boolean
  hasMore: boolean
  fetchNextPage: () => void
  openKey: string
  onOpenKeyChange: (key: string) => void
  renderMenu: (flight: Flight) => React.ReactNode
}

export function FlightList({
  data,
  count,
  isLoading,
  isFetching,
  hasMore,
  fetchNextPage,
  openKey,
  onOpenKeyChange,
  renderMenu,
}: FlightListProps) {
  return (
    <InfiniteList
      hasMore={hasMore}
      isFetching={isFetching}
      isLoading={isLoading}
      count={count}
      fetchNextPage={fetchNextPage}
      renderEndMessage={renderEndMessage}
    >
      <ItemGroup>
        <ItemTitle>Found {data.length} flights</ItemTitle>
        <Accordion
          type="single"
          collapsible
          value={openKey}
          onValueChange={onOpenKeyChange}
        >
          {data.map((flight) => {
            const itemKey = String(flight.id)

            return (
              <FlightItem
                key={itemKey}
                flight={flight}
                itemKey={itemKey}
                menuSlot={renderMenu(flight)}
              />
            )
          })}
        </Accordion>
      </ItemGroup>
    </InfiniteList>
  )
}
