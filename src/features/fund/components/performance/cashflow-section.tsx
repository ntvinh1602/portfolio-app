"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { Cashflow } from "../ui/cashflow"
import { useCashflow } from "@fund/hooks/use-performance-data"
import StatusLabel from "@/components/status-label"
import { SimpleChartSkeleton } from "@/components/skeletons/chart-card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNum } from "@/lib/utils"

function useCashflowSummary(
  deposits: number | undefined,
  withdrawals: number | undefined,
) {
  return useMemo(() => {
    if (deposits == null || withdrawals == null) return null
    const inflow = deposits
    const outflow = Math.abs(withdrawals)
    const net = inflow + withdrawals
    return { inflow, outflow, net }
  }, [deposits, withdrawals])
}

export function CashflowSection() {
  const meta = { name: "Net Cashflow" }
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useCashflow(year)
  const summary = useCashflowSummary(data?.deposits, data?.withdrawals)

  if (!data || !summary)
    return (
      <SimpleChartSkeleton name={meta.name}>
        <StatusLabel type="error" description="Unable to get any data" />
      </SimpleChartSkeleton>
    )

  const { inflow, outflow, net } = summary

  if (isLoading)
    return (
      <SimpleChartSkeleton name={meta.name}>
        <Skeleton className="h-30 w-full" />
      </SimpleChartSkeleton>
    )
    
  if (error)
    return (
      <SimpleChartSkeleton name={meta.name}>
        <StatusLabel type="error" description={error.message} />
      </SimpleChartSkeleton>
    )

  return (
    <Cashflow
      name={meta.name}
      net={formatNum(Math.abs(net))}
      inflow={formatNum(inflow)}
      outflow={formatNum(outflow)}
    />
  )
}
