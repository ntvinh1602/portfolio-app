"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { BenchmarkChart } from "../ui/benchmark-chart"
import { useBenchmark } from "@fund/hooks/use-performance-data"
import type { BenchmarkView, BenchmarkChartCols } from "@fund/fund.types"
import { FullChartSkeleton } from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"
import { colsToRows } from "@fund/utils"

function useBenchmarkChartData(data: BenchmarkView | undefined) {
  return useMemo(() => {
    if (!data) return null
    return {
      equityReturn: data.equity_ret,
      vnIndexReturn: data.vn_ret,
      chartRows: colsToRows(data.return_chart as BenchmarkChartCols),
    }
  }, [data])
}

export function BenchmarkSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useBenchmark(year)
  const chartData = useBenchmarkChartData(data)
  const meta = { name: "Alpha", stat1: "equity return", stat2: "VNI return" }

  if (isLoading)
    return (
      <FullChartSkeleton name={meta.name} stat1={meta.stat1} stat2={meta.stat2}>
        <StatusLabel
          type="loading"
          title="In progress..."
          description="Pulling in data to draw your chart"
          className="py-25"
        />
      </FullChartSkeleton>
    )
  if (error)
    return (
      <FullChartSkeleton name={meta.name} stat1={meta.stat1} stat2={meta.stat2}>
        <StatusLabel
          type="error"
          description={error.message}
          className="py-25"
        />
      </FullChartSkeleton>
    )
  if (!data || !chartData)
    return (
      <FullChartSkeleton name={meta.name} stat1={meta.stat1} stat2={meta.stat2}>
        <StatusLabel
          type="error"
          description="Unable to get any data"
          className="py-25"
        />
      </FullChartSkeleton>
    )

  return (
    <BenchmarkChart
      meta={meta}
      year={year!}
      equityReturn={chartData.equityReturn}
      vnIndexReturn={chartData.vnIndexReturn}
      chartRows={chartData.chartRows}
    />
  )
}
