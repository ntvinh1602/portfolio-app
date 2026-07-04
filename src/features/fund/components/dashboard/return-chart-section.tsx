"use client"

import { useMemo } from "react"
import { useDashboardDateRange } from "./context"
import { ReturnChart } from "@fund/components/chart/return-chart"
import { useBenchmarkRolling } from "@fund/hooks/use-dashboard-data"
import type {
  BenchmarkChartCols,
  BenchmarkRollingView,
} from "@fund/fund.types"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"

function colsToRows({ d, p, v }: BenchmarkChartCols) {
  const out = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = { t: d[i] * 86_400_000, portfolio_value: p[i], vni_value: v[i] }
  }
  return out
}

function useReturnChartData(
  data: BenchmarkRollingView | undefined,
  dateRange: string,
) {
  return useMemo(() => {
    if (!data) return null
    const chartData = data.returnchart
    const cols =
      chartData[dateRange as keyof typeof chartData] ?? chartData.last_1y
    return {
      chartTimeframe: colsToRows(cols),
      twrYtd: data.twr_ytd,
      twrAll: data.twr_all,
      cagr: data.cagr,
    }
  }, [data, dateRange])
}

export function ReturnChartSection() {
  const { dateRange } = useDashboardDateRange()
  const { data, error, isLoading } = useBenchmarkRolling()
  const chartData = useReturnChartData(data, dateRange)

  if (isLoading) return <ChartCardSkeleton />
  if (error) return <StatusLabel type="error" />
  if (!chartData) return null

  return <ReturnChart dateRange={dateRange} {...chartData} />
}
