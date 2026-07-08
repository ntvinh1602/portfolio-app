import { Suspense } from "react"
import { TransactionsProvider } from "@fund/components/transactions/context"
import { Transactions } from "@fund/components/transactions/transactions"

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsProvider>
        <Transactions />
      </TransactionsProvider>
    </Suspense>
  )
}
