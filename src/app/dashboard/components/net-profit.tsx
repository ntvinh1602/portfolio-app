import { format } from "date-fns"
import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { useMonthlyData } from "@/hooks/useMonthlyData"

export function NetProfit() {
  const { data } = useMonthlyData("1y")

  const processedData = data
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(d => ({
      revenue: d.pnl + d.fee + d.interest + d.tax,
      pnl: d.pnl,
      fee: -d.fee,
      interest: -d.interest,
      tax: -d.tax,
      date: d.date
    }))
  const totalPnL = processedData.reduce((acc, curr) => acc + curr.pnl, 0)
  const avgPnL = processedData.reduce((acc, curr) => acc + curr.pnl, 0) / 12
  const avgExpense = -processedData.reduce((acc, curr) => acc + curr.revenue - curr.pnl, 0) / 12

  return (
    <ChartCard
      title="Net Profit"
      majorValue={totalPnL}
      majorValueFormatter={(value) => formatNum(value)}
      description="last 1y"
      minorValue1={avgPnL}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="avg. profit"
      minorValue2={avgExpense}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="avg. cost"
      chartComponent={ChartBarStacked}
      chartData={processedData}
      chartConfig={{
        tax: {
          label: "Tax",
          color: "var(--chart-4)",
        },
        fee: {
          label: "Fee",
          color: "var(--chart-3)",
        },
        interest: {
          label: "Interest",
          color: "var(--chart-1)",
        },
        revenue: {
            label: "Revenue",
            color: "var(--chart-2)",
        }
      }}
      chartClassName="h-full w-full"
      chartDataKeys={["tax", "fee", "interest", "revenue"]}
      dateRange="1y"
      yAxisTickFormatter={(value) => compactNum(Number(value))}
      xAxisTickFormatter={(value) => format(new Date(value), "MMM yy")}
      tooltipValueFormatter={(value) => formatNum(value)}
    />
  )
}