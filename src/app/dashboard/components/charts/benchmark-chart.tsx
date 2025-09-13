import * as React from "react"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { useDashboardData } from "@/hooks/useDashboardData"

export function Benchmarkchart() {
  const {
    twrData,
    benchmarkData,
    cagr
  } = useDashboardData()
  const [dateRange, setDateRange] = React.useState("1y")
  const chartData = benchmarkData[dateRange as keyof typeof benchmarkData]

   return (
     <div className="flex-1">
       {!twrData ? <ChartCardSkeleton cardClassName="gap-2 h-full" chartHeight="h-full" /> :
         <ChartCard
          description="Total Return"
          majorValue={twrData?.all_time}
          majorValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
          minorValue1={twrData?.ytd}
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
              color: "var(--chart-1)",
            },
            vni_value: {
              label: "VN-Index",
              color: "var(--chart-2)",
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
      }
    </div>
  )
}