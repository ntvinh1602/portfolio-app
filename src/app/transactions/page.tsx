"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { TxnInfo } from "./components/txn-info"
import { Transaction } from "./components/columns"
import { DateRange } from "@/components/date-picker"
import { subMonths, format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { TxnTable } from "./components/txn-table"
import { useTransactions } from "@/hooks/useTransactions"
import { TxnLeg, Expense } from "./types/data"
import { useTransactionDetails } from "@/hooks/useTransactionInfo"

export default function Page() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    subMonths(new Date(), 1)
  )
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())

  const startDate = dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined
  const endDate = dateTo ? format(dateTo, "yyyy-MM-dd") : undefined

  // ---- Fetch transactions using SWR hook ----
  const { transactions: data, isLoading: txnLoading, isError } = useTransactions({
    startDate,
    endDate,
  })

  // ---- Selected transaction ----
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null)

  // ---- Fetch details via RPC hook ----
  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailError,
  } = useTransactionDetails({
    txn_id: selectedTxn?.id || "",
    include_expenses:
      selectedTxn?.type === "buy" || selectedTxn?.type === "sell" ? true : false,
  })

  const txnLegs: TxnLeg[] = detailData?.legs || []
  const expenses: Expense[] = detailData?.expenses || []

  // ---- Error handling ----
  if (isError) {
    toast.error("Failed to fetch transactions")
  }
  if (detailError) {
    toast.error("Failed to fetch transaction details")
  }

  return (
    <div className="flex flex-col">
      <Header title="Transactions" />
      <Separator className="mb-4" />
      <div className="flex gap-4 flex-1 overflow-hidden w-8/10 mx-auto">
        <div className="flex w-6/10 flex-col gap-2">
          <TxnTable
            data={data || []}
            loading={txnLoading}
            onTransactionSelect={setSelectedTxn}
          >
            <DateRange
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </TxnTable>
        </div>
        <div className="flex w-4/10 flex-col gap-2">
          <TxnInfo
            transaction={selectedTxn}
            transactionLegs={txnLegs}
            associatedExpenses={expenses}
            loading={detailLoading}
          />
        </div>
      </div>
    </div>
  )
}
