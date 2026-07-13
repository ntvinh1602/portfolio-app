"use client"

import { useState } from "react"
import StatusLabel from "@/components/status-label"
import { useFlightsData } from "./flights-data-context"
import { FlightItemMenu } from "./flight-item-menu"
import { FlightList } from "../ui/flight-list"

export function FlightsListSection() {
  const {
    state: { data, count, isLoading, isFetching, error, hasMore },
    actions: { fetchNextPage },
  } = useFlightsData()

  const [openKey, setOpenKey] = useState("")

  if (error) return <StatusLabel type="error" />

  return (
    <FlightList
      data={data}
      count={count ?? 0}
      isLoading={isLoading}
      isFetching={isFetching}
      hasMore={hasMore}
      fetchNextPage={fetchNextPage}
      openKey={openKey}
      onOpenKeyChange={setOpenKey}
      renderMenu={(flight) => <FlightItemMenu flight={flight} />}
    />
  )
}
