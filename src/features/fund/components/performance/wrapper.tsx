"use client"

import { YearPicker } from "@/components/year-picker"
import { usePerformanceYear } from "./context"
import { CashflowSection } from "./cashflow-section"
import { ExpenseChartSection } from "./expense-chart-section"
import { TopStocksSection } from "./top-stocks-section"
import { NetProfitSection } from "./netprofit-section"
import { BenchmarkSection } from "./benchmark-section"
import { PageTitle } from "@/components/page-title"

export function Performance() {
  const { year, setYear, startYear } = usePerformanceYear()

  return (
    <div className="@container/main flex flex-1">
      <div className="flex flex-col w-full gap-6 xl:grid-cols-2 max-w-280 mx-auto">
        <PageTitle title="Annual Performance">
          <div className="w-40">
            <YearPicker
              value={year}
              onChange={setYear}
              startYear={startYear}
              iconDisplay={false}
            />
          </div>
        </PageTitle>
        <div className="grid xl:grid-cols-2 gap-4 xl:gap-6">
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 h-fit">
              <CashflowSection />
              <ExpenseChartSection />
            </div>
            <TopStocksSection />
          </div>

          <div className="flex flex-col flex-1 gap-4">
            <NetProfitSection />
            <BenchmarkSection />
          </div>
        </div>
      </div>
    </div>
  )
}
