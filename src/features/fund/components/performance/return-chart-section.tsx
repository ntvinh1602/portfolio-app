"use client"

import { useState, useEffect } from "react"
import { usePerformanceYear } from "./context"
import { ReturnChart } from "./return-chart"
import { getReturn, getReturnAllTime } from "@/features/fund/actions/get-performance"
import type { ReturnView } from "@/features/fund/actions/get-performance"
import ChartCardSkeleton from "@/components/skeletons/chart-card"

export function ReturnChartSection() {
  const { year } = usePerformanceYear()
  const [data, setData] = useState<ReturnView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (year === null) return
    let cancelled = false
    setData(null)
    setLoading(true)

    const fn = year === 9999 ? getReturnAllTime : () => getReturn(year)
    fn()
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [year])

  if (loading) return <ChartCardSkeleton />
  if (!data) return null

  return (
    <ReturnChart
      year={year!}
      equityReturn={data.equity_ret}
      vnIndexReturn={data.vn_ret}
      chartData={data.return_chart}
    />
  )
}
