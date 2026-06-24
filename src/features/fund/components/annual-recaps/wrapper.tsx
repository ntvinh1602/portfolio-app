"use client"

import { useState, useMemo, useEffect } from "react"
import { YearPicker } from "@/components/year-picker"
import { ProfitChart } from "./profit-chart"
import { ExpenseChart } from "./expense-chart"
import { TopStocks } from "./top-stocks"
import { Cashflow } from "./cashflow"
import { ReturnChart } from "./return-chart"
import type { Recaps } from "@/types/recaps"

export default function AnnualRecaps({
  recaps,
  startYear,
}: {
  recaps: Recaps
  startYear: number
}) {
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])
  const yearMap = useMemo(() => Object.fromEntries(recaps.map((d) => [d.year, d])), [recaps])
  const yearData = year !== null ? yearMap[year] : undefined
  if (!yearData || year === null) return null

  return (
    <div className="@container/main flex flex-1 flex-col px-4 pb-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 max-w-720 gap-4 mx-auto">
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
          <div className="grid grid-cols-2 gap-4 h-fit">
            <Cashflow
              deposits={yearData.deposits}
              withdrawals={yearData.withdrawals}
            />
            <ExpenseChart profitChart={yearData.profit_chart} />
          </div>
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
      </div>
    </div>
  )
}