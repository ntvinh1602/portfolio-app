import { useState } from "react"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useLiveData } from "@/app/dashboard/context/live-data-context"
import { useDelayedData } from "@/hooks/useDelayedData"

export function EquityChart() {
  const { totalEquity } = useLiveData()
  const { pnlData, equityData, isLoading } = useDelayedData()
  const [dateRange, setDateRange] = useState("1y")

  if (isLoading) return (
    <ChartCardSkeleton
      title="Equity"
      minorText1="this month"
      minorText2="this year"
      cardClassName="gap-4 h-full"
    />
  )
    
  const chartData = equityData[dateRange as keyof typeof equityData]

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