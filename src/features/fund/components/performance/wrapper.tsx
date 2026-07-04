"use client"

import { YearPicker } from "@/components/year-picker"
import { usePerformanceYear } from "./context"
import { CashflowSection } from "./cashflow-section"
import { ExpenseChartSection } from "./expense-chart-section"
import { TopStocksSection } from "./top-stocks-section"
import { NetProfitSection } from "./netprofit-section"
import { ReturnChartSection } from "./return-chart-section"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AssetItemSkeleton } from "@/components/skeletons/item"

export function Performance() {
  const { year, setYear, startYear } = usePerformanceYear()

  if (year === null) return null

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
          <ReturnChartSection />
        </div>
      </div>
    </div>
  )
}

export function PerformanceSkeleton() {
  return (
    <div className="@container/main flex flex-1 flex-col px-4 pb-4">
      <div className="grid grid-cols-1 w-full xl:grid-cols-2 max-w-300 gap-4 mx-auto">
        <div className="flex flex-col gap-4">
          <Skeleton className="w-full h-10 rounded-full" />
          <div className="grid grid-cols-2 gap-4 h-fit">
            <ChartCardSkeleton showMetricsSection={false} />
            <ChartCardSkeleton showMetricsSection={false} />
          </div>
          <Card className="w-full">
            <CardHeader>
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-md sm:h-9 sm:w-36" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <AssetItemSkeleton />
              <AssetItemSkeleton />
              <AssetItemSkeleton />
              <AssetItemSkeleton />
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <ChartCardSkeleton />
          <ChartCardSkeleton />
        </div>
      </div>
    </div>
  )
}
