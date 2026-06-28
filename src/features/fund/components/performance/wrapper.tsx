"use client"

import { useState, useMemo, useEffect } from "react"
import { YearPicker } from "@/components/year-picker"
import { ExpenseChart } from "../chart/expense-chart"
import { TopStocks } from "./top-stocks"
import { Cashflow } from "./cashflow"
import { ReturnChart } from "./return-chart"
import type { Performance } from "@fund/fund.types"
import { NetProfitChart } from "../chart/netprofit-chart"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AssetItemSkeleton } from "@/components/skeletons/item"

export function Performance({
  results,
  startYear,
}: {
  results: Performance[]
  startYear: number
}) {
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])
  const yearMap = useMemo(
    () => Object.fromEntries(results.map((d) => [d.year, d])),
    [results],
  )
  const yearData = year !== null ? yearMap[year] : undefined
  if (!yearData || year === null) return null

  return (
    <div className="@container/main flex flex-1 pb-4">
      <div className="grid grid-cols-1 w-full gap-6 px-2 md:px-6 xl:grid-cols-2 max-w-300 mx-auto">
        <div className="flex flex-col gap-6">
          <div className="grid sm:grid-cols-2 grid-cols-1 gap-4 h-fit">
            <div className="flex flex-col gap-4">
              <YearPicker
                value={year}
                onChange={setYear}
                startYear={startYear}
              />
              <Cashflow
                deposits={yearData.deposits}
                withdrawals={yearData.withdrawals}
              />
            </div>

            <ExpenseChart profitChart={yearData.profit_chart} />
          </div>
          <TopStocks year={year} stockData={yearData.stock_pnl} />
        </div>

        <div className="flex flex-col flex-1 gap-6">
          <NetProfitChart year={year} data={yearData} />
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
