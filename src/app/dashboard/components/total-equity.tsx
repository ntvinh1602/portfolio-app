import { useState } from "react"
import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useEquityChartData } from "@/hooks/useEquityChartData"
import { usePnL } from "@/hooks/usePnL"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"

export function EquityChart() {
  const [dateRange, setDateRange] = useState("1y")
  const { data: bsData } = useBalanceSheetData()
  const { data: chartData } = useEquityChartData(dateRange)
  const { data: pnl_mtd } = usePnL("mtd")
  const { data: pnl_ytd } = usePnL("ytd")

  const totalEquity = bsData
    .filter((r) => r.type === "equity")
    .reduce((sum, r) => sum + (r.amount || 0), 0)

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
        net_equity_value: {
          label: "Equity",
          color: "var(--chart-2)",
        },
        total_cashflow: {
          label: "Paid-in Capital",
          color: "var(--chart-1)",
        },
      }}
      chartClassName="h-full w-full"
      chartDataKeys={["net_equity_value", "total_cashflow"]}
      legend={true}
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      tooltipValueFormatter={(value) => formatNum(value)}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  )
}
