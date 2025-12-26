import { format } from "date-fns"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { useDelayedData } from "@/hooks/useDelayedData"

export function MonthlyChart({ year }: { year: string }) {
  const { monthlyData: AllTimeData, isLoading } = useDelayedData()

  if (isLoading)
    return (
      <ChartCardSkeleton
        description="Total Income"
        minorText1="avg. last 12M"
        minorText2="avg. all time"
        cardClassName="gap-4 h-full"
        tabswitch={false}
      />
    )
    
  // Filter and process chart data by selected year
  const filteredData = AllTimeData
    .filter((d) => {
      if (year === "All Time") return true
      const dataYear = new Date(d.date).getFullYear()
      return dataYear === Number(year)
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      revenue: d.pnl + d.fee + d.interest + d.tax,
      pnl: d.pnl,
      fee: -d.fee,
      interest: -d.interest,
      tax: -d.tax,
      snapshot_date: d.date,
    }))

  const totalPnL = filteredData.reduce((acc, curr) => acc + curr.pnl, 0)
  const avgPnl = filteredData.reduce((acc, curr) => acc + curr.pnl, 0) / filteredData.length
  const avgExpenses =
    -filteredData.reduce((acc, curr) => acc + curr.revenue - curr.pnl, 0) / filteredData.length

  return (
    <ChartCard
      description="Net Income"
      majorValue={totalPnL}
      majorValueFormatter={(value) => formatNum(value)}
      minorValue1={avgPnl}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="avg. income"
      minorValue2={avgExpenses}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="avg. expenses"
      chartComponent={ChartBarStacked}
      chartData={filteredData}
      chartConfig={{
        tax: {
          label: "Tax",
          color: "var(--chart-1)",
        },
        fee: {
          label: "Fee",
          color: "var(--chart-2)",
        },
        interest: {
          label: "Interest",
          color: "var(--chart-3)",
        },
        revenue: {
          label: "Revenue",
          color: "var(--chart-4)",
        },
      }}
      chartClassName="h-full w-full"
      xAxisDataKey="snapshot_date"
      chartDataKeys={["tax", "fee", "interest", "revenue"]}
      dateRange="1y"
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      xAxisTickFormatter={(value) => format(new Date(value), "MMM yy")}
      tooltipValueFormatter={(value) => formatNum(value)}
    />
  )
}
