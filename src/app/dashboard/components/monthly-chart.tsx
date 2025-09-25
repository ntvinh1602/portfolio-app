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

  if (isLoading || !AllTimeData)
    return <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-full" />

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
  const totalPnL = AllTimeData.reduce((acc, curr) => acc + curr.pnl, 0)
  const last12MPnL = last12MData.reduce((acc, curr) => acc + curr.pnl, 0)
  const avgLast12MPnL = last12MPnL / 12
  const avgAllTimePnL = totalPnL / AllTimeData.length

  return (
    <ChartCard
      description="Total Income"
      majorValue={totalPnL}
      majorValueFormatter={(value) => formatNum(value)}
      minorValue1={avgLast12MPnL}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="avg. last 12M"
      minorValue2={avgAllTimePnL}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="avg. all time"
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