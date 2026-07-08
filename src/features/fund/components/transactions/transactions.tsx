"use client"

import { PageTitle } from "@/components/page-title"
import { AddEventSection } from "./add-event-section"
import { TransactionsFilterSection } from "./transactions-filter-section"
import { TransactionsListSection } from "./transactions-list-section"

export function Transactions() {
  return (
    <div className="@container/main flex flex-1 flex-col ">
      <div className="flex flex-col w-full xl:max-w-280 gap-4 mx-auto">
        <PageTitle title="Transaction Events">
          <AddEventSection />
        </PageTitle>
        <div className="flex flex-col w-full gap-8">
          <TransactionsFilterSection />
          <TransactionsListSection />
        </div>
      </div>
    </div>
  )
}
