"use client"

import { YearPicker } from "@/components/year-picker"
import { usePerformanceYear } from "./context"
import { CashflowSection } from "./cashflow-section"
import { ExpenseChartSection } from "./expense-chart-section"
import { TopStocksSection } from "./top-stocks-section"
import { NetProfitSection } from "./netprofit-section"
import { BenchmarkSection } from "./benchmark-section"

export function Performance() {
  const { year, setYear, startYear } = usePerformanceYear()

  return (
    <div className="@container/main flex flex-1">
      <div className="grid grid-cols-1 w-full gap-6 xl:grid-cols-2 max-w-300 mx-auto">
        <div className="flex flex-col gap-6">
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 h-fit">
            <div className="flex flex-col gap-4">
              <YearPicker
                value={year}
                onChange={setYear}
                startYear={startYear}
              />
              <CashflowSection />
            </div>

            <ExpenseChartSection />
          </div>
          <TopStocksSection />
        </div>

        <div className="flex flex-col flex-1 gap-6">
          <NetProfitSection />
          <BenchmarkSection />
        </div>
      </div>
    </div>
  )
}
