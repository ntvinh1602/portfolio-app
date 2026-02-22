"use client"

import { Card, CardContent, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { compactNum } from "@/lib/utils"
import { HandCoins } from "lucide-react"
import { useMonthlyData } from "@/hooks/useMonthlyData"

export function ExpenseChart({
  year,
  className,
}: {
  year: string
  className?: string
}) {
  const period = year === "All Time" ? "all" : Number(year)
  const { data: monthlyData } = useMonthlyData(period)

  // ---------- Process Data ----------
  const processedData = monthlyData
    .filter((d) => {
      if (year === "All Time") return true
      const dataYear = new Date(d.snapshot_date).getFullYear()
      return dataYear === Number(year)
    })
    .map((d) => ({
      revenue: d.pnl + d.fee + d.interest + d.tax,
      pnl: d.pnl,
      fee: -d.fee,
      interest: -d.interest,
      tax: -d.tax,
      snapshot_date: d.snapshot_date,
    }))

  const expenseChartCfg = {
    tax: {
      label: "Tax",
      color: "var(--chart-4)",
    },
    fee: {
      label: "Fee",
      color: "var(--chart-3)",
    },
    interest: {
      label: "Interest",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const expenseChartData = [
    {
      liability: "tax",
      allocation: processedData.reduce((acc, curr) => acc - curr.tax, 0),
      fill: "var(--chart-4)",
    },
    {
      liability: "fee",
      allocation: processedData.reduce((acc, curr) => acc - curr.fee, 0),
      fill: "var(--chart-3)",
    },
    {
      liability: "interest",
      allocation: processedData.reduce((acc, curr) => acc - curr.interest, 0),
      fill: "var(--chart-1)",
    },
  ].filter((d) => d.allocation > 0)

  const totalExpenses = processedData.reduce(
    (acc, curr) => acc - curr.fee - curr.tax - curr.interest,
    0
  )

  return (
    <Card className={`gap-0 h-fit rounded-xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent ${className}`}>
      <CardHeader>
        <CardTitle className="text-xl">Expenses</CardTitle>
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
