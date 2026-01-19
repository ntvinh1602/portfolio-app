"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { YearSelect } from "./components/year-select"
import { MonthlyChart } from "./components/monthly-chart"
import { ExpenseChart } from "./components/expense-chart"
import { StockLeaderboard } from "./components/stock-leaderboard"
import { Cashflow } from "./components/cashflow"
import { ReturnChart } from "./components/return-chart"

export default function Page() {
  const [year, setYear] = useState(new Date().getFullYear().toString())

  return (
    <div className="flex flex-col md:h-svh pb-4 overflow-hidden">
      <Header title="Reports" />

      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 flex-1 px-2 md:px-0">
        <YearSelect value={year} onChange={setYear} startYear={2022} />

        <div className="grid grid-cols-1 md:grid-cols-10 gap-6 flex-1">
          <div className="flex md:col-span-3 flex-col h-full">
            <StockLeaderboard year={year} />
          </div>
          <div className="flex md:col-span-4 h-full flex-col gap-2 min-w-0">
            <MonthlyChart year={year} />
            <ReturnChart year={year} />
          </div>
          <div className="flex md:col-span-3 flex-col gap-2 min-w-0 h-full">
            <Cashflow year={year} />
            <ExpenseChart year={year} />
          </div>
        </div>
      </div>
    </div>
  )
}
