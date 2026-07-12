"use client"

import { useState } from "react"
import StatusLabel from "@/components/status-label"
import { useFlightsData } from "./flights-data-context"
import { useDeleteFlight } from "@flight/hooks/use-delete-flight"
import { FlightList } from "../ui/flight-list"

export function FlightsListSection() {
  const {
    state: { data, count, isLoading, isFetching, error, hasMore },
    actions: { fetchNextPage, triggerRefresh },
  } = useFlightsData()

  const [openKey, setOpenKey] = useState("")
  const deleteFlight = useDeleteFlight(triggerRefresh)

  if (error) return <StatusLabel type="error" />

  return (
    <FlightList
      data={data}
      count={count ?? 0}
      isLoading={isLoading}
      isFetching={isFetching}
      hasMore={hasMore}
      fetchNextPage={fetchNextPage}
      onMutationSuccess={triggerRefresh}
      openKey={openKey}
      onOpenKeyChange={setOpenKey}
      onDeleteFlight={deleteFlight}
    />
  )
}
