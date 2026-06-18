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
import type { Recaps } from "@/types/recaps"

export default function AnnualRecapsClient({ recaps }: { recaps: Recaps }) {
  const [year, setYear] = useState(new Date().getFullYear())

  const yearMap = useMemo( () => Object.fromEntries(recaps.map(d => [d.year, d])), [recaps] )
  const yearData = yearMap[year]
  const startYear = recaps[0].year

  if (!yearData) return null

  return (
    <div className="@container/main flex flex-1 flex-col px-4 pb-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="flex flex-col gap-4">
          <YearPicker
            value={year}
            onChange={setYear}
            startYear={startYear}
          />
          <TopStocks
            year={year}
            stockData={yearData.stock_pnl}
          />
        </div>
        
        <div className="flex flex-col flex-1 gap-4">
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
        
        <div className="flex flex-col flex-1 gap-4">
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