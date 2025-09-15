import * as React from "react"
import { format } from "date-fns"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { useDashboardData } from "@/hooks/useDashboardData"

export function ExpenseChart() {
  const { monthlyData, isLoading } = useDashboardData()

  if (isLoading || !monthlyData)
    return <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-full" />

  const chartData = monthlyData.slice(-12).map(d => ({ ...d, snapshot_date: d.date }))
  const totalPnL = monthlyData.reduce((acc, curr) => acc + curr.pnl, 0)
  const last12MPnL = chartData.reduce((acc, curr) => acc + curr.pnl, 0)
  const avgLast12MPnL = last12MPnL / chartData.length
  const avgAllTimePnL = totalPnL / monthlyData.length

  return (
    <div className="flex-1">
      <ChartCard
        description="Total P/L"
        majorValue={totalPnL}
        majorValueFormatter={(value) => formatNum(value)}
        minorValue1={avgLast12MPnL}
        minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
        minorText1="avg. last 12M"
        minorValue2={avgAllTimePnL}
        minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
        minorText2="avg. all time"
        chartComponent={ChartBarStacked}
        chartData={chartData}
        chartConfig={{
          tax: {
            label: "Tax",
            color: "var(--chart-1)",
          },
          fee: {
            label: "Fee",
            color: "var(--chart-2)",
          },
          interest: {
            label: "Interest",
            color: "var(--chart-3)",
          },
          pnl: {
              label: "Net P/L",
              color: "var(--chart-4)",
          }
        }}
        chartClassName="h-full w-full"
        xAxisDataKey="snapshot_date"
        chartDataKeys={["tax", "fee", "interest", "pnl"]}
        dateRange="1y"
        yAxisTickFormatter={(value) => compactNum(Number(value))}
        xAxisTickFormatter={(value) => format(new Date(value), "MMM yy")}
        tooltipValueFormatter={(value) => formatNum(value)}
      />
    </div>
  )
}