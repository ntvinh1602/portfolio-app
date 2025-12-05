import { useState } from "react"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useDelayedData } from "@/hooks/useDelayedData"

export function Benchmarkchart() {
  const { twrData, benchmarkData, isLoading } = useDelayedData()
  const [dateRange, setDateRange] = useState("1y")

  if (isLoading) return (
    <ChartCardSkeleton
      description="Total Return"
      minorText1="this year"
      minorText2="annualized"
      cardClassName="gap-4 h-full"
    />
  )

  const chartData = benchmarkData[dateRange as keyof typeof benchmarkData]

  const years = (new Date().getTime() - new Date('2021-11-09').getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const cagr = (Math.pow(1 + twrData.all_time, 1 / years) - 1) * 100

   return (
    <ChartCard
      description="Total Return"
      majorValue={twrData.all_time}
      majorValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
      minorValue1={twrData.ytd}
      minorValue1Formatter={(value) => `${formatNum(value * 100, 1)}%`}
      minorText1="this year"
      minorValue2={cagr}
      minorValue2Formatter={(value) => `${formatNum(value, 1)}%`}
      minorText2="annualized"
      chartComponent={Areachart}
      chartData={chartData}
      chartConfig={{
        portfolio_value: {
          label: "Equity",
          color: "var(--chart-2)",
        },
        vni_value: {
          label: "VN-Index",
          color: "var(--chart-1)",
        },
      }}
      chartClassName="h-full w-full"
      xAxisDataKey="snapshot_date"
      chartDataKeys={["portfolio_value", "vni_value"]}
      legend={true}
      yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
      tooltipValueFormatter={(value) => formatNum(value, 1)}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  )
}