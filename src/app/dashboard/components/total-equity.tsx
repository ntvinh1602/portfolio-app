import { useState } from "react"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useEquityChartData } from "@/hooks/useEquityChartData"
import { usePnL } from "@/hooks/usePnL"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"

export function EquityChart() {
  const [dateRange, setDateRange] = useState("1y")
  const { balanceSheet } = useBalanceSheetData()

  // Safety guard for undefined data
  const data = Array.isArray(balanceSheet) ? balanceSheet : []

  const totalEquity = data
    .filter((r) => r.type === "equity")
    .reduce((sum, r) => sum + (r.amount || 0), 0)

  // Equity chart data (line chart)
  const { data: chartRawData, isLoading: isChartLoading } = useEquityChartData({ time: dateRange })

  // Fetch MTD and YTD separately
  const { data: pnl_mtd, isLoading: isMtdLoading } = usePnL("mtd")
  const { data: pnl_ytd, isLoading: isYtdLoading } = usePnL("ytd")

  const isLoading = isChartLoading || isMtdLoading || isYtdLoading

  if (isLoading) {
    return (
      <ChartCardSkeleton
        title="Equity"
        minorText1="this month"
        minorText2="this year"
        cardClassName="gap-4 h-full"
      />
    )
  }

  const chartData = (chartRawData ?? []).map((d) => ({
    snapshot_date: d.date,
    net_equity_value: d.net_equity_value,
    total_cashflow: d.total_cashflow,
  }))

  return (
    <ChartCard
      title="Equity"
      majorValue={totalEquity}
      majorValueFormatter={formatNum}
      minorValue1={pnl_mtd ?? 0}
      minorValue1Formatter={compactNum}
      minorText1="this month"
      minorValue2={pnl_ytd ?? 0}
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
      xAxisDataKey="snapshot_date"
      chartDataKeys={["net_equity_value", "total_cashflow"]}
      legend={true}
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      tooltipValueFormatter={(value) => formatNum(value)}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  )
}
