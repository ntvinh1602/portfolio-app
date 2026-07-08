import { Suspense } from "react"
import { AddEventProvider } from "@fund/components/transactions/add-event-context"
import { Transactions } from "@fund/components/transactions/transactions"
import { TransactionsDataProvider } from "@fund/components/transactions/transactions-data-context"

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsDataProvider>
        <AddEventProvider>
          <Transactions />
        </AddEventProvider>
      </TransactionsDataProvider>
    </Suspense>
  )
}
