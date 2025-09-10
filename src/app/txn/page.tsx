"use client"

import * as React from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [dateTo, setDateTo] = React.useState<Date | undefined>(
    new Date()
  )

  React.useEffect(() => {
    async function fetchData() {
      const response = await fetch("/api/query/transactions")
      const result = await response.json()
      setData(result)
    }
    fetchData()
  }, [])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col px-4">
        <Header title="Transactions" />
        <div className="grid grid-cols-3 px-0 gap-2 flex-1 overflow-hidden">
          <div className="flex flex-col gap-2 col-span-2 px-0">
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
                  { label: "Cashflow", value: "cash" },
                  { label: "Trades", value: "trade" }
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
            />
          </div>
          <div className="flex flex-col gap-2 col-span-1 px-0">
            <Card className="">
              <CardHeader>
                <CardTitle className="text-xl">
                  Transaction Details
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
