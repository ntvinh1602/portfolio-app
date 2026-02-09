import { useState } from "react"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useLiveData } from "@/app/dashboard/context/live-data-context"
import { useDelayedData } from "@/hooks/useDelayedData"
import { useEquityChartData } from "@/hooks/useEquityChartData"

export function EquityChart() {
  const [dateRange, setDateRange] = useState("1y")
  const { totalEquity } = useLiveData()
  const { pnlData, isLoading } = useDelayedData()
  const { data, isLoading: isChartLoading } = useEquityChartData({ time: dateRange })

  if ( isLoading || isChartLoading ) return (
    <ChartCardSkeleton
      title="Equity"
      minorText1="this month"
      minorText2="this year"
      cardClassName="gap-4 h-full"
    />
  )
    
  const chartData = (data ?? []).map((d) => ({
    snapshot_date: d.date,
    net_equity_value: d.net_equity_value,
    total_cashflow: d.total_cashflow
  }))

  return (
    <ChartCard
      title="Equity"
      majorValue={totalEquity}
      majorValueFormatter={(value) => formatNum(value)}
      minorValue1={pnlData.mtd ?? 0}
      minorValue1Formatter={(value) => compactNum(value)}
      minorText1="this month"
      minorValue2={pnlData.ytd ?? 0}
      minorValue2Formatter={(value) => compactNum(value)}
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