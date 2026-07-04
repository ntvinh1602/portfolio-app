"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { NetProfitChart } from "../chart/netprofit-chart"
import { useProfit } from "@fund/hooks/use-performance-data"
import type { ProfitView, ProfitChartCols } from "@fund/fund.types"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"

type ProfitChartRow = {
  snapshot_date: string
  revenue: number
  fee: number
  interest: number
  tax: number
}

function columnsToRows(cols: ProfitChartCols): ProfitChartRow[] {
  return cols.snapshot_date.map((snapshot_date, i) => ({
    snapshot_date,
    revenue: cols.revenue[i],
    fee: cols.fee[i],
    interest: cols.interest[i],
    tax: cols.tax[i],
  }))
}

function useNetProfitChartData(data: ProfitView | undefined) {
  return useMemo(() => {
    if (!data) return null
    return {
      totalPnl: data.total_pnl,
      avgProfit: data.avg_profit,
      avgExpense: data.avg_expense,
      chartRows: columnsToRows(data.profit_chart as ProfitChartCols),
    }
  }, [data])
}

export function NetProfitSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useProfit(year)
  const chartData = useNetProfitChartData(data as ProfitView | undefined)

  if (isLoading) return <ChartCardSkeleton />
  if (error) return <StatusLabel type="error" />
  if (!data || !chartData) return null

  return <NetProfitChart year={year!} {...chartData} />
}
