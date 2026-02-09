"use client"

import { format } from "date-fns"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { useMonthlyData } from "@/hooks/useMonthlyData"

// ---------- Types ----------
interface RawData {
  date: string
  pnl: number
  fee: number
  interest: number
  tax: number
}

interface ChartData {
  revenue: number
  pnl: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
  [key: string]: string | number
}

// ---------- Helper: Group All Time data by year ----------
function groupByYear(data: RawData[]): ChartData[] {
  const grouped: Record<
    string,
    { pnl: number; fee: number; interest: number; tax: number }
  > = {}

  data.forEach((d) => {
    const year = new Date(d.date).getFullYear().toString()
    if (!grouped[year]) {
      grouped[year] = { pnl: 0, fee: 0, interest: 0, tax: 0 }
    }
    grouped[year].pnl += d.pnl
    grouped[year].fee += d.fee
    grouped[year].interest += d.interest
    grouped[year].tax += d.tax
  })

  return Object.entries(grouped).map(([year, totals]) => ({
    revenue: totals.pnl + totals.fee + totals.interest + totals.tax,
    pnl: totals.pnl,
    fee: -totals.fee,
    interest: -totals.interest,
    tax: -totals.tax,
    snapshot_date: year,
  }))
}

// ---------- Main Chart Component ----------
export function ProfitChart({ year }: { year: string }) {
  const period = year === "All Time" ? "all" : Number(year)
  const { data: monthlyData, isLoading } = useMonthlyData(period)

  if (isLoading || !monthlyData)
    return (
      <ChartCardSkeleton
        title="Net Profit"
        minorText1="avg. profit"
        minorText2="avg. cost"
        cardClassName="gap-4 h-full"
        tabswitch={false}
      />
    )

  let processedData: ChartData[] = []

  if (year === "All Time") {
    processedData = groupByYear(monthlyData as RawData[])
  } else {
    processedData = (monthlyData as RawData[])
      .filter((d) => new Date(d.date).getFullYear() === Number(year))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        revenue: d.pnl + d.fee + d.interest + d.tax,
        pnl: d.pnl,
        fee: -d.fee,
        interest: -d.interest,
        tax: -d.tax,
        snapshot_date: d.date,
      }))
  }

  const totalPnL = processedData.reduce((acc, curr) => acc + curr.pnl, 0)
  const avgPnl = totalPnL / (processedData.length || 1)
  const avgExpenses =
    -processedData.reduce((acc, curr) => acc + curr.revenue - curr.pnl, 0) /
    (processedData.length || 1)

  return (
    <ChartCard
      title="Net Profit"
      majorValue={totalPnL}
      majorValueFormatter={(value) => formatNum(value)}
      minorValue1={avgPnl}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="avg. profit"
      minorValue2={avgExpenses}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="avg. cost"
      chartComponent={ChartBarStacked}
      chartData={processedData}
      chartConfig={{
        tax: { label: "Tax", color: "var(--chart-4)" },
        fee: { label: "Fee", color: "var(--chart-3)" },
        interest: { label: "Interest", color: "var(--chart-1)" },
        revenue: { label: "Revenue", color: "var(--chart-2)" },
      }}
      chartClassName="h-full w-full"
      xAxisDataKey="snapshot_date"
      chartDataKeys={["tax", "fee", "interest", "revenue"]}
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      xAxisTickFormatter={(value: string | number) => {
        const date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
        return year === "All Time" ? format(date, "yyyy") : format(date, "MMM")
      }}
      tooltipValueFormatter={(value) => formatNum(value)}
    />
  )
}
