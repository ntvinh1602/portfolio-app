"use client"

import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { compactNum } from "@/lib/utils"
import { HandCoins } from "lucide-react"

interface ProfitChartItem {
  revenue: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
}

interface ExpenseChartProps {
  profitChart: ProfitChartItem[]
  className?: string
}

export function ExpenseChart({
  profitChart,
  className,
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
    <Card
      className={`gap-0 h-fit rounded-xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent ${className ?? ""}`}
    >
      <CardHeader>
        <CardTitle className="text-xl font-normal">Expenses</CardTitle>
        <CardAction>
          <HandCoins className="size-5 stroke-1" />
        </CardAction>
      </CardHeader>

      <CardContent className="px-0 flex h-fit justify-between">
        <Piechart
          data={expenseChartData}
          chartConfig={expenseChartCfg}
          dataKey="allocation"
          nameKey="liability"
          className="w-full"
          innerRadius={60}
          legend="bottom"
          label
          label_pos={1.5}
          margin_tb={1}
          centerText="Total Expenses"
          centerValue={compactNum(totalExpenses)}
        />
      </CardContent>
    </Card>
  )
}