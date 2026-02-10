"use client"

import { Areachart } from "@/components/charts/areachart"
import { formatNum } from "@/lib/utils"
import * as Card from "@/components/ui/card"
import { useReportsData } from "@/hooks/useReportsData"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { format } from "date-fns"
import { useReturnChartData } from "@/hooks/useReturnChartData"

interface ReturnChartProps {
  year: string
}

export function ReturnChart({ year }: ReturnChartProps) {
  const { yearlyData, isLoading: isReportsLoading } = useReportsData()

  // Convert UI “All Time” to backend time parameter
  const timeParam = year === "All Time" ? "all" : year
  const { data, isLoading: isFetching, error } = useReturnChartData(timeParam)

  const isLoading = isFetching || isReportsLoading

  if (isLoading || !yearlyData) {
    return (
      <ChartCardSkeleton
        title="Equity Return"
        minorText1="VN-Index"
        tabswitch={false}
      />
    )
  }

  if (error) {
    return (
      <Card.Root variant="glow" className="relative flex flex-col gap-4 h-full">
        <Card.Header>
          <Card.Subtitle>Error</Card.Subtitle>
          <Card.Title className="text-red-500 text-lg">
            {error instanceof Error ? error.message : "Internal Server Error"}
          </Card.Title>
        </Card.Header>
      </Card.Root>
    )
  }

  const chartData = data.map((d) => ({
    snapshot_date: d.date,
    portfolio_value: d.portfolio_value,
    vni_value: d.vni_value,
  }))

  const yearNum = year === "All Time" ? "All-Time" : year
  const yearData = yearlyData.find((item) => item.year === yearNum)
  const equityReturn = yearData?.equity_ret ?? 0
  const vnIndexReturn = yearData?.vn_ret ?? 0

  return (
    <ChartCard
      title="Equity Return"
      majorValue={equityReturn}
      majorValueFormatter={(value) => `${formatNum(value, 1)}%`}
      minorValue1={vnIndexReturn}
      minorValue1Formatter={(value) => `${formatNum(value, 1)}%`}
      minorText1="VN-Index"
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
      chartClassName="h-full w-full pt-4"
      xAxisDataKey="snapshot_date"
      chartDataKeys={["portfolio_value", "vni_value"]}
      legend={true}
      yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
      xAxisTickFormatter={(value: string | number) => {
        const date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
        return year === "All Time" ? format(date, "MMM yyyy") : format(date, "dd MMM")
      }}
      tooltipValueFormatter={(value) => formatNum(value, 1)}
    />
  )
}
