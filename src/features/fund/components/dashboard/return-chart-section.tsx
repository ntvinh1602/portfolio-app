"use client"

import { useMemo } from "react"
import { useDashboardDateRange } from "./context"
import { ReturnChart } from "@/features/fund/components/ui/return-chart"
import { useBenchmarkRolling } from "@fund/hooks/use-dashboard-data"
import type { BenchmarkRollingView } from "@fund/fund.types"
import { FullChartSkeleton } from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"
import { colsToRows } from "@fund/utils"

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
  const meta = { name: "Return", stat1: "all time", stat2: "annualized" }

  if (!isLoading)
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

  return <ReturnChart dateRange={dateRange} {...chartData} />
}
