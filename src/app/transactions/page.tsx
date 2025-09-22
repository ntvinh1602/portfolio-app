"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { TransactionDetails } from "./components/details"
import { Transactions } from "./components/table"
import { columns, Transaction } from "./components/columns"
import { TabSwitcher } from "@/components/tab-switcher"
import { DateRange } from "@/components/date-picker"
import { subMonths, format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { TxnLeg, Expense } from "./types/data"
import { toast } from "sonner"

export default function Page() {
  const [data, setData] = React.useState<Transaction[]>([])
  const [category, setCategory] = React.useState("trade")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    subMonths(new Date(), 1)
  )
  const [dateTo, setDateTo] = React.useState<Date | undefined>(new Date())
  const [selectedTxn, setSelectedTxn] = React.useState<Transaction | null>(null)
  const [txnLegs, setTxnLegs] = React.useState<TxnLeg[]>([])
  const [expenses, setExpenses] = React.useState<Expense[]>([])
  const [txnLoading, setTxnLoading] = React.useState(true)
  const [detailLoading, setDetailLoading] = React.useState(false)

  const handleTransactionSelect = async (transaction: Transaction) => {
    setSelectedTxn(transaction)
    setDetailLoading(true)
    try {
      const isTrade = transaction.type === "buy" || transaction.type === "sell" ? "true" : "false"

      const params = new URLSearchParams({
        txnID: transaction.id,
        isExpense: isTrade,
      })

      const response = await fetch(`/api/gateway/txn-info?${params.toString()}`)

      const result = await response.json()

      if (!response.ok) {
        const errorMessage = result?.error || "Failed to fetch transaction details"
        throw new Error(errorMessage)
      }

      setTxnLegs(result.legs || [])
      setExpenses(result.expenses || [])
    } catch (err) {
      console.error(err)
      const message =
        err instanceof Error ? err.message : "Failed to fetch transactions"
      toast.error(message)
    } finally {
      setDetailLoading(false)
    }
  }

  React.useEffect(() => {
    async function fetchData() {
      setTxnLoading(true)
      try {
        const params = new URLSearchParams()
        if (dateFrom) params.set("startDate", format(dateFrom, "yyyy-MM-dd"))
        if (dateTo) params.set("endDate", format(dateTo, "yyyy-MM-dd"))

        const response = await fetch(`/api/gateway/txn-feed?${params.toString()}`)

        const result = await response.json()

        if (!response.ok) {
          const errorMessage = result?.error || "Failed to fetch transactions"
          throw new Error(errorMessage)
        }

        setData(result)
      } catch (err) {
        console.error(err)
        const message =
          err instanceof Error ? err.message : "Failed to fetch transactions"
        toast.error(message)
      } finally {
        setTxnLoading(false)
      }
    }

    fetchData()
  }, [dateFrom, dateTo])


  const transactionCounts = React.useMemo(() => {
    return data.reduce(
      (acc, transaction) => {
        if (["buy", "sell", "split"].includes(transaction.type)) {
          acc.trade += 1
        } else {
          acc.cash += 1
        }
        return acc
      },
      { cash: 0, trade: 0 }
    )
  }, [data])

  return (
    <div className="flex flex-col">
      <Header title="Transactions" />
      <Separator className="mb-4" />
      <div className="flex gap-4 flex-1 overflow-hidden w-8/10 mx-auto">
        <div className="flex w-6/10 flex-col gap-2">
          <div className="flex justify-between items-center">
            <DateRange
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <TabSwitcher
              variant="content"
              value={category}
              onValueChange={setCategory}
              options={[
                {
                  label: "Cashflow",
                  value: "cash",
                  number: transactionCounts.cash,
                },
                {
                  label: "Trades",
                  value: "trade",
                  number: transactionCounts.trade,
                },
              ]}
            />
          </div>
          <Transactions
            columns={columns}
            data={data}
            category={category}
            onRowClick={handleTransactionSelect}
            selectedTransaction={selectedTxn}
            loading={txnLoading}
          />
        </div>
        <div className="flex w-4/10 flex-col gap-2">
          <TransactionDetails
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
