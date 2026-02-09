import { useState } from "react"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useReturnChartData } from "@/hooks/useReturnChartData"
import { useTWR } from "@/hooks/useTWR"

export function Benchmarkchart() {
  const [dateRange, setDateRange] = useState("1y")
  const { data, isLoading: isChartLoading } = useReturnChartData({ time: dateRange })
  
  // Fetch MTD and YTD separately
  const { data: twr_ytd, isLoading: isYtdLoading } = useTWR("ytd")
  const { data: twr_all, isLoading: isAllLoading } = useTWR("all")

  if ( isYtdLoading || isAllLoading || isChartLoading ) return (
    <ChartCardSkeleton
      title="Year-to-Date Return"
      minorText1="all time"
      minorText2="annualized"
      cardClassName="gap-4 h-full"
    />
  )

  const chartData = (data ?? []).map((d) => ({
    snapshot_date: d.date,
    portfolio_value: d.portfolio_value,
    vni_value: d.vni_value,
  }))

  const years = (new Date().getTime() - new Date('2021-11-09').getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  const cagr = (Math.pow(1 + twr_all, 1 / years) - 1) * 100

   return (
    <ChartCard
      title="Return"
      majorValue={twr_ytd}
      majorValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
      description="this year"
      minorValue1={twr_all}
      minorValue1Formatter={(value) => `${formatNum(value * 100, 1)}%`}
      minorText1="all time"
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