"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { TransactionDetails } from "./components/details"
import { Transactions } from "./components/table"
import { columns, Transaction } from "./components/columns"
import { TabSwitcher } from "@/components/tab-switcher"
import { DateRange } from "@/components/date-picker"
import { subMonths, format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { TxnLeg, Expense } from "./types/data"

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
  const [error, setError] = React.useState<string | null>(null)

  const handleTransactionSelect = async (transaction: Transaction) => {
    setSelectedTxn(transaction)
    setDetailLoading(true)
    try {
      const isTrade = (transaction.type === "buy" || transaction.type === "sell")
        ? "true"
        : "false"

      const url = new URL("/api/gateway/txn-info", window.location.origin)
      url.searchParams.append("txnID", transaction.id)
      url.searchParams.append("isExpense", isTrade)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch transaction details")
      }

      const result = await response.json()
      setTxnLegs(result.legs || [])
      setExpenses(result.expenses || [])
    } catch (err) {
      console.error(err)
      setError("Failed to fetch transaction details")
    } finally {
      setDetailLoading(false)
    }
  }

  React.useEffect(() => {
    async function fetchData() {
      setTxnLoading(true)
      try {
        const url = new URL("/api/gateway/txn-feed", window.location.origin)
        if (dateFrom) {
          url.searchParams.append("startDate", format(dateFrom, "yyyy-MM-dd"))
        }
        if (dateTo) {
          url.searchParams.append("endDate", format(dateTo, "yyyy-MM-dd"))
        }

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error(err)
        setError("Failed to fetch transactions")
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
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <SidebarInset className="flex flex-col px-4">
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
            {error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <TransactionDetails
                transaction={selectedTxn}
                transactionLegs={txnLegs}
                associatedExpenses={expenses}
                loading={detailLoading}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
