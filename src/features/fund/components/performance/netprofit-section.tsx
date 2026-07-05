"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { NetProfitChart } from "../ui/netprofit-chart"
import { useProfit } from "@fund/hooks/use-performance-data"
import type { ProfitView, ProfitChartCols } from "@fund/fund.types"
import { FullChartSkeleton } from "@/components/skeletons/chart-card"
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
    const profitChart = data.profit_chart as ProfitChartCols | null
    if (!profitChart?.snapshot_date) return null
    return {
      totalPnl: data.total_pnl,
      avgProfit: data.avg_profit,
      avgExpense: data.avg_expense,
      chartRows: columnsToRows(profitChart),
    }
  }, [data])
}

export function NetProfitSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useProfit(year)
  const chartData = useNetProfitChartData(data as ProfitView | undefined)

  const meta = { name: "Net Profit", stat1: "avg. profit", stat2: "avg. cost" }

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


  return <NetProfitChart meta={meta} year={year!} {...chartData} />
}
