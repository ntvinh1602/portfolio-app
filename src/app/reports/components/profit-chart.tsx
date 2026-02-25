"use client"

import { format } from "date-fns"
import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"

// ---------- Types ----------
export interface ProfitChartItem {
  revenue: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
  [key: string]: string | number
}

interface ProfitChartProps {
  year: number
  totalPnL: number
  avgProfit: number
  avgExpense: number
  chartData: ProfitChartItem[]
}

// ---------- Component ----------
export function ProfitChart({
  year,
  totalPnL,
  avgProfit,
  avgExpense,
  chartData,
}: ProfitChartProps) {

  const xAxisFormatter = (value: string | number) => {
    const date = new Date(value)

    if (isNaN(date.getTime())) {
      return String(value)
    }

    return year === 9999
      ? format(date, "yyyy")
      : format(date, "MMM")
  }

  return (
    <ChartCard
      title="Net Profit"
      majorValue={totalPnL}
      majorValueFormatter={formatNum}
      minorValue1={avgProfit}
      minorValue1Formatter={(v) => `${compactNum(Math.abs(v))}`}
      minorText1="avg. profit"
      minorValue2={avgExpense}
      minorValue2Formatter={(v) => `${compactNum(Math.abs(v))}`}
      minorText2="avg. cost"
      chartComponent={ChartBarStacked}
      chartData={chartData}
      chartConfig={{
        tax: { label: "Tax", color: "var(--chart-4)" },
        fee: { label: "Fee", color: "var(--chart-3)" },
        interest: { label: "Interest", color: "var(--chart-1)" },
        revenue: { label: "Revenue", color: "var(--chart-2)" },
      }}
      chartClassName="h-full w-full"
      chartDataKeys={["tax", "fee", "interest", "revenue"]}
      yAxisTickFormatter={(v) => compactNum(Number(v))}
      xAxisTickFormatter={xAxisFormatter}
      tooltipValueFormatter={(v) => formatNum(v)}
    />
  )
}