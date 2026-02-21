"use client"

import { useState } from "react"
import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useEquityChartData } from "@/hooks/useEquityChart"
import { usePnL } from "@/hooks/usePnL"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"

export function EquityChart() {
  const [dateRange, setDateRange] = useState("1y")
  const { totalEquity } = useBalanceSheetData()
  const { data: chartData } = useEquityChartData(dateRange)
  const { data: pnl_mtd } = usePnL("mtd")
  const { data: pnl_ytd } = usePnL("ytd")

  return (
    <ChartCard
      title="Equity"
      majorValue={totalEquity}
      majorValueFormatter={formatNum}
      minorValue1={pnl_mtd}
      minorValue1Formatter={compactNum}
      minorText1="this month"
      minorValue2={pnl_ytd}
      minorValue2Formatter={compactNum}
      minorText2="this year"
      chartComponent={Areachart}
      chartData={chartData}
      chartConfig={{
        net_equity: {
          label: "Equity",
          color: "var(--chart-1)",
        },
        cumulative_cashflow: {
          label: "Paid-in Capital",
          color: "var(--chart-2)",
        },
      }}
      chartClassName="h-full w-full"
      chartDataKeys={["net_equity", "cumulative_cashflow"]}
      legend={true}
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      tooltipValueFormatter={(value) => formatNum(value)}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  )
}
