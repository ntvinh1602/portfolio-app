"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { ExpenseChart } from "../ui/expense-chart"
import { useProfit } from "@fund/hooks/use-performance-data"
import type { ProfitChartCols } from "@fund/fund.types"
import { SimpleChartSkeleton } from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNum } from "@/lib/utils"

type ExpenseChartDatum = Record<string, unknown>

const sum = (xs: number[]) => xs.reduce((acc, n) => acc + (n || 0), 0)

function useExpenseChartData(
  profitChart: ProfitChartCols | undefined,
): { totalExpenses: number; chartData: ExpenseChartDatum[] } | null {
  return useMemo(() => {
    if (!profitChart) return null
    const totalTax = -sum(profitChart.tax)
    const totalFee = -sum(profitChart.fee)
    const totalInterest = -sum(profitChart.interest)
    const totalExpenses = totalTax + totalFee + totalInterest
    const chartData: ExpenseChartDatum[] = [
      { liability: "tax", allocation: totalTax },
      { liability: "fee", allocation: totalFee },
      { liability: "interest", allocation: totalInterest },
    ].filter((d) => d.allocation > 0)
    return { totalExpenses, chartData }
  }, [profitChart])
}

export function ExpenseChartSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useProfit(year)
  const expenseData = useExpenseChartData(
    data?.profit_chart as ProfitChartCols | undefined,
  )
  const meta = { name: "Total Expenses" }

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
  if (!data || !expenseData)
    return (
      <SimpleChartSkeleton name={meta.name}>
        <StatusLabel type="error" description="Unable to get any data" />
      </SimpleChartSkeleton>
    )

  return (
    <ExpenseChart
      name={meta.name}
      totalExpenses={formatNum(expenseData.totalExpenses)}
      chartData={expenseData.chartData}
    />
  )
}
