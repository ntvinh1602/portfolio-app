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

  if (isLoading || !pnlData || !equityData)
    return <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-full" />
    
  const chartData = equityData[dateRange as keyof typeof equityData]

  return (
    <ChartCard
      description="Total Equity"
      majorValue={totalEquity}
      majorValueFormatter={(value) => formatNum(value)}
      minorValue1={pnlData.mtd}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="this month"
      minorValue2={pnlData.ytd}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="this year"
      chartComponent={Areachart}
      chartData={chartData}
      chartConfig={{
        net_equity_value: {
          label: "Equity",
          color: "var(--chart-1)",
        },
      }}
      chartClassName="h-full w-full"
      xAxisDataKey="snapshot_date"
      chartDataKeys={["net_equity_value"]}
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      tooltipValueFormatter={(value) => formatNum(value)}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  )
}