"use client"

import * as Card from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { compactNum } from "@/lib/utils"
import { HandCoins } from "lucide-react"
import { useMonthlyData } from "@/hooks/useMonthlyData"

// ---------- Types ----------
interface RawData {
  date: string
  pnl: number
  fee: number
  interest: number
  tax: number
}

export function ExpenseChart({
  year,
  className,
}: {
  year: string
  className?: string
}) {
  const period = year === "All Time" ? "all" : Number(year)
  const { data: monthlyData, isLoading } = useMonthlyData(period)

  if (isLoading || !monthlyData)
    return (
      <Card.Root className="gap-0 h-fit">
        <Card.Header>
          <Card.Title>Expenses</Card.Title>
        </Card.Header>
        <Card.Content className="px-0 flex w-full justify-between">
          <div className="flex w-full justify-between">
            <Skeleton className="size-40 aspect-square rounded-full" />
            <div className="flex flex-col w-full gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-10" />
              ))}
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    )

  // ---------- Process Data ----------
  const processedData = (monthlyData as RawData[])
    .filter((d) => {
      if (year === "All Time") return true
      const dataYear = new Date(d.date).getFullYear()
      return dataYear === Number(year)
    })
    .map((d) => ({
      revenue: d.pnl + d.fee + d.interest + d.tax,
      pnl: d.pnl,
      fee: -d.fee,
      interest: -d.interest,
      tax: -d.tax,
      snapshot_date: d.date,
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
    <Card.Root variant="glow" className={`gap-0 h-fit ${className}`}>
      <Card.Header>
        <Card.Title className="text-xl">Expenses</Card.Title>
        <Card.Action>
          <HandCoins className="size-5 stroke-1" />
        </Card.Action>
      </Card.Header>
      <Card.Content className="px-0 flex h-fit justify-between">
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
      </Card.Content>
    </Card.Root>
  )
}
