import { format } from "date-fns"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { useDelayedData } from "@/hooks/useDelayedData"

export function ExpenseChart() {
  const {
    monthlyData: AllTimeData,
    isLoading
  } = useDelayedData()

  if (isLoading)
    return (
    <ChartCardSkeleton
      description="Last 12M Income"
      minorText1="avg. income"
      minorText2="avg. expenses"
      cardClassName="gap-4 h-full"
      tabswitch={false}
    />
  )

  const last12MData = AllTimeData
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12)
    .map(d => ({
      revenue: d.pnl + d.fee + d.interest + d.tax,
      pnl: d.pnl,
      fee: -d.fee,
      interest: -d.interest,
      tax: -d.tax,
      snapshot_date: d.date
    }))
  const totalPnL = last12MData.reduce((acc, curr) => acc + curr.pnl, 0)
  const avg12MPnl = last12MData.reduce((acc, curr) => acc + curr.pnl, 0) / 12
  const avg12MExpenses = -last12MData.reduce((acc, curr) => acc + curr.revenue - curr.pnl, 0) / 12

  return (
    <ChartCard
      description="Last 12M Income"
      majorValue={totalPnL}
      majorValueFormatter={(value) => formatNum(value)}
      minorValue1={avg12MPnl}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="avg. income"
      minorValue2={avg12MExpenses}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="avg. expenses"
      chartComponent={ChartBarStacked}
      chartData={last12MData}
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
        }
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