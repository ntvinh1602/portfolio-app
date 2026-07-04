"use client"

import { useMemo } from "react"
import { useDashboardDateRange } from "./context"
import { EquityChart } from "@fund/components/chart/equity-chart"
import { useEquityRolling } from "@fund/hooks/use-dashboard-data"
import type { EquityChartCols, EquityRollingView } from "@fund/fund.types"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"

function colsToRows({ d, e, c }: EquityChartCols) {
  const out = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = {
      t: d[i] * 86_400_000,
      net_equity: e[i],
      cumulative_cashflow: c[i],
    }
  }
  return out
}

function useEquityChartData(
  data: EquityRollingView | undefined,
  dateRange: string,
) {
  return useMemo(() => {
    if (!data) return null
    const chartData = data.equitychart
    const cols =
      chartData[dateRange as keyof typeof chartData] ?? chartData.last_1y
    return {
      chartTimeframe: colsToRows(cols),
      totalEquity: data.total_equity,
      pnlMtd: data.pnl_mtd,
      pnlYtd: data.pnl_ytd,
    }
  }, [data, dateRange])
}

export function EquityChartSection() {
  const { dateRange } = useDashboardDateRange()
  const { data, error, isLoading } = useEquityRolling()
  const chartData = useEquityChartData(data, dateRange)

  if (isLoading) return <ChartCardSkeleton />
  if (error) return <StatusLabel type="error" />
  if (!chartData) return null

  return <EquityChart dateRange={dateRange} {...chartData} />
}
