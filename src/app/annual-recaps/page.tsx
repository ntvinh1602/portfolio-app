"use client"

import { useState, useMemo } from "react"
import {
  YearPicker,
  ProfitChart,
  ExpenseChart,
  TopStocks,
  Cashflow,
  ReturnChart,
} from "./components"
import { useReports } from "@/hooks/useReports"

export default function Page() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data, isLoading, error } = useReports()

  const yearData = useMemo(
    () => data.find((item) => item.year === year),
    [data, year]
  )

  const startYear = data[0]?.year ?? new Date().getFullYear()

  if (error) {
    return <div className="text-red-500">{error.message}</div>
  }

  if (isLoading || !yearData) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 flex-1 px-2 md:px-0">
      <YearPicker
        value={year}
        onChange={setYear}
        startYear={startYear}
      />

      <div className="grid grid-cols-1 md:grid-cols-10 gap-6 flex-1">
        <div className="flex md:col-span-3 flex-col h-full">
          <TopStocks
            year={year}
            stockData={yearData.stock_pnl}
          />
        </div>

        <div className="flex md:col-span-4 h-full flex-col gap-2 min-w-0">
          <ProfitChart
            year={year}
            totalPnL={yearData.total_pnl}
            avgProfit={yearData.avg_profit}
            avgExpense={yearData.avg_expense}
            chartData={yearData.profit_chart}
          />
          <ReturnChart
            year={year}
            equityReturn={yearData.equity_ret}
            vnIndexReturn={yearData.vn_ret}
            chartData={yearData.return_chart}
          />
        </div>

        <div className="flex md:col-span-3 flex-col gap-2 min-w-0 h-full">
          <Cashflow
            deposits={yearData.deposits}
            withdrawals={yearData.withdrawals}
          />

          <ExpenseChart profitChart={yearData.profit_chart} />
        </div>
      </div>
    </div>
  )
}