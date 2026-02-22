"use client"

import { Areachart } from "@/components/charts/areachart"
import { formatNum } from "@/lib/utils"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useReportsData } from "@/hooks/useReportsData"
import { ChartCard } from "@/components/chart-card"
import { format } from "date-fns"
import { useReturnChartData } from "@/hooks/useReturnChart"

interface ReturnChartProps {
  year: string
}

export function ReturnChart({ year }: ReturnChartProps) {
  const { yearlyData } = useReportsData()

  // Convert UI “All Time” to backend time parameter
  const timeParam = year === "All Time" ? "all" : year
  const { data, error } = useReturnChartData(timeParam)

  if (error) {
    return (
      <Card className="relative flex flex-col gap-4 h-full rounded-xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent">
        <CardHeader>
          <CardDescription>Error</CardDescription>
          <CardTitle className="text-red-500 text-lg">
            {error instanceof Error ? error.message : "Internal Server Error"}
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }
  
  const yearNum = year === "All Time" ? "All-Time" : year
  const yearData = yearlyData?.find((item) => item.year === yearNum)
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
      chartData={data}
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
