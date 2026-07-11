"use client"

import { usePerformanceYear } from "./context"
import { CashflowSection } from "./cashflow-section"
import { ExpenseChartSection } from "./expense-chart-section"
import { TopStocksSection } from "./top-stocks-section"
import { NetProfitSection } from "./netprofit-section"
import { BenchmarkSection } from "./benchmark-section"
import { PageTitle } from "@/components/layout/page-title"
import { SelectAllEnabled } from "@/components/filter/select-options"
import { Calendar } from "lucide-react"

export function Performance() {
  const { year, setYear, startYear } = usePerformanceYear()

  const years = Array.from(
    { length: new Date().getFullYear() - startYear + 1 },
    (_, i) => startYear + i,
  ).reverse()

  const yearOptions = years.map((y) => ({
    key: y.toString(),
    label: y.toString(),
  }))

  return (
    <div className="@container/main flex flex-1 pb-4">
      <div className="flex flex-col w-full gap-6 xl:grid-cols-2 max-w-300 mx-auto">
        <PageTitle title="Annual Performance">
          <div className="w-50">
            <SelectAllEnabled
              icon={Calendar}
              placeholder="Select year"
              value={year?.toString() ?? null}
              onValueChange={(v) => setYear(v === null ? null : Number(v))}
              allLabel="All Years"
              options={yearOptions}
            />
          </div>
        </PageTitle>
        <div className="grid xl:grid-cols-2 gap-4 xl:gap-6">
          <div className="flex flex-col flex-1 gap-4">
            <NetProfitSection />
            <BenchmarkSection />
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 h-fit">
              <CashflowSection />
              <ExpenseChartSection />
            </div>
            <TopStocksSection />
          </div>
        </div>
      </div>
    </div>
  )
}
