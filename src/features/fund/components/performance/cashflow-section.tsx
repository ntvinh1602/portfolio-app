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
    const inflow = deposits ?? 0
    const outflow = Math.abs(withdrawals ?? 0)
    const net = inflow + (withdrawals ?? 0)
    return { inflow, outflow, net }
  }, [deposits, withdrawals])
}

export function CashflowSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useCashflow(year)
  const { inflow, outflow, net } = useCashflowSummary(
    data?.deposits,
    data?.withdrawals,
  )
  const meta = { name: "Net Cashflow" }

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
  if (!data)
    return (
      <SimpleChartSkeleton name={meta.name}>
        <StatusLabel type="error" description="Unable to get any data" />
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
