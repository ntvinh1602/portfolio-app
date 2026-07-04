"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { BenchmarkChart } from "./benchmark-chart"
import { useBenchmark } from "@fund/hooks/use-performance-data"
import type { BenchmarkView, BenchmarkChartCols } from "@fund/fund.types"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"

type BenchmarkRow = { t: number; portfolio_value: number; vni_value: number }

function colsToRows({ d, p, v }: BenchmarkChartCols): BenchmarkRow[] {
  const out: BenchmarkRow[] = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = { t: d[i] * 86_400_000, portfolio_value: p[i], vni_value: v[i] }
  }
  return out
}

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

  if (isLoading) return <ChartCardSkeleton />
  if (error) return <StatusLabel type="error" />
  if (!data || !chartData) return null

  return (
    <BenchmarkChart
      year={year!}
      equityReturn={chartData.equityReturn}
      vnIndexReturn={chartData.vnIndexReturn}
      chartRows={chartData.chartRows}
    />
  )
}
