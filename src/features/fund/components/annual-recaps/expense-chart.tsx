"use client"

import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { formatNum } from "@/lib/utils"
import { HandCoins } from "lucide-react"
import type { ProfitChartItem } from "@fund/fund.types"

interface ExpenseChartProps {
  profitChart: ProfitChartItem[]
  className?: string
}

export function ExpenseChart({
  profitChart
}: ExpenseChartProps) {

  // Aggregate total expenses
  const totalTax = profitChart.reduce((acc, d) => acc - (d.tax || 0), 0)
  const totalFee = profitChart.reduce((acc, d) => acc - (d.fee || 0), 0)
  const totalInterest = profitChart.reduce((acc, d) => acc - (d.interest || 0), 0)

  const totalExpenses = totalTax + totalFee + totalInterest

  const expenseChartCfg: ChartConfig = {
    tax: { label: "Tax", color: "var(--chart-4)" },
    fee: { label: "Fee", color: "var(--chart-3)" },
    interest: { label: "Interest", color: "var(--chart-1)" },
  }

  const expenseChartData = [
    { liability: "tax", allocation: totalTax, fill: "var(--chart-4)" },
    { liability: "fee", allocation: totalFee, fill: "var(--chart-3)" },
    { liability: "interest", allocation: totalInterest, fill: "var(--chart-1)" },
  ].filter((d) => d.allocation > 0)

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          Total Expenses
        </CardDescription>
        <CardTitle className="text-2xl">{formatNum(totalExpenses)}</CardTitle>
        <CardAction>
          <HandCoins className="stroke-1" />
        </CardAction>
      </CardHeader>

      <CardContent className="h-full">
        <Piechart
          data={expenseChartData}
          chartConfig={expenseChartCfg}
          dataKey="allocation"
          nameKey="liability"
          className="w-full max-h-50"
          innerRadius={60}
          legend="right"
          label_pos={1.5}
          margin_tb={1}
        />
      </CardContent>
    </Card>
  )
}