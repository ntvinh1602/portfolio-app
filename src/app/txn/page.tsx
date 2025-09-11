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
import { subMonths } from "date-fns"

export default function Page() {
  const [data, setData] = React.useState<Transaction[]>([])
  const [category, setCategory] = React.useState("trade")
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    subMonths(new Date(), 1)
  )
  const [dateTo, setDateTo] = React.useState<Date | undefined>(new Date())
  const [selectedTransaction, setSelectedTransaction] =
    React.useState<Transaction | null>(null)
  const [transactionLegs, setTransactionLegs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleTransactionSelect = async (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setLoading(true)
    setError(null)
    try {
      const url = new URL(
        "/api/query/transaction-legs",
        window.location.origin
      )
      url.searchParams.append("transactionId", transaction.id)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch transaction legs")
      }
      const result = await response.json()
      setTransactionLegs(result)
    } catch (error) {
      setError("Failed to fetch transaction legs")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const url = new URL("/api/query/transactions", window.location.origin)
        if (dateFrom) {
          url.searchParams.append("startDate", dateFrom.toISOString())
        }
        if (dateTo) {
          url.searchParams.append("endDate", dateTo.toISOString())
        }
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }
        const result = await response.json()
        setData(result)
      } catch (error) {
        setError("Failed to fetch transactions")
      } finally {
        setLoading(false)
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
      <AppSidebar />
      <SidebarInset className="flex flex-col px-4">
        <Header title="Transactions" />
        <div className="flex gap-4 flex-1 overflow-hidden w-3/4 mx-auto">
          <div className="flex w-6/10 flex-col gap-2">
            <div className="flex justify-between items-center">
              <DateRange
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
              <TabSwitcher
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
                border={false}
                tabClassName="ml-auto"
                triggerClassName="w-30 border-b rounded-none data-[state=active]:border-primary data-[state=active]:text-primary text-md"
                indicatorClassName="bg-none"
              />
            </div>
            <Transactions
              columns={columns}
              data={data}
              category={category}
              onRowClick={handleTransactionSelect}
              selectedTransaction={selectedTransaction}
            />
          </div>
          <div className="flex w-4/10 flex-col gap-2">
            {error && <p className="text-red-500">{error}</p>}
            <TransactionDetails
              transaction={selectedTransaction}
              transactionLegs={transactionLegs}
              loading={loading}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
