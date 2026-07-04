"use client"

import { useState, useEffect } from "react"
import { usePerformanceYear } from "./context"
import { ExpenseChart } from "../chart/expense-chart"
import { getProfit, getProfitAllTime } from "@/features/fund/actions/get-performance"
import type { ProfitView } from "@/features/fund/actions/get-performance"
import ChartCardSkeleton from "@/components/skeletons/chart-card"

export function ExpenseChartSection() {
  const { year } = usePerformanceYear()
  const [data, setData] = useState<ProfitView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (year === null) return
    let cancelled = false
    setData(null)
    setLoading(true)

    const fn = year === 9999 ? getProfitAllTime : () => getProfit(year)
    fn()
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [year])

  if (loading) return <ChartCardSkeleton showMetricsSection={false} />
  if (!data) return null

  return <ExpenseChart profitChart={data.profit_chart} />
}
