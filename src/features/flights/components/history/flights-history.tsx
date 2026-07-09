"use client"

import { PageTitle } from "@/components/page-title"
import { FlightsFilterSection } from "./flights-filter-section"
import { FlightsListSection } from "./flights-list-section"
import { AddFlightSection } from "./add-flight-section"

export function FlightsHistory() {
  return (
    <div className="@container/main flex flex-1 flex-col ">
      <div className="flex flex-col w-full xl:max-w-280 gap-4 mx-auto">
        <PageTitle title="Flights History">
          <AddFlightSection />
        </PageTitle>
        <div className="flex flex-col w-full gap-8">
          <FlightsFilterSection />
          <FlightsListSection />
        </div>
      </div>
    </div>
  )
}
