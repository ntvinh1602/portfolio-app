import { Areachart } from "@/components/charts/areachart"
import { formatNum } from "@/lib/utils"
import { format } from "date-fns"
import { ChartCard } from "@/components/chart-card"

interface ReturnChartProps {
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartData: any[]
}

export function ReturnChart({
  year,
  equityReturn,
  vnIndexReturn,
  chartData,
}: ReturnChartProps) {
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
      chartDataKeys={["portfolio_value", "vni_value"]}
      legend={true}
      yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
      xAxisTickFormatter={(value: string | number) => {
        const date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
        return year === 9999
          ? format(date, "MMM yyyy")
          : format(date, "dd MMM")
      }}
      tooltipValueFormatter={(value) => formatNum(value, 1)}
    />
  )
}