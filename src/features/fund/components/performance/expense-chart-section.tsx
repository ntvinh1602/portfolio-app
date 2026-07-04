"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { ExpenseChart } from "../chart/expense-chart"
import { useProfit } from "@fund/hooks/use-performance-data"
import type { ProfitChartCols } from "@fund/fund.types"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"

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

  if (isLoading) return <ChartCardSkeleton showMetricsSection={false} />
  if (error) return <StatusLabel type="error" />
  if (!data || !expenseData) return null

  return <ExpenseChart {...expenseData} />
}
