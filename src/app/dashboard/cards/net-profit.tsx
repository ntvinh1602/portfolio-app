import { format } from "date-fns"
import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { useDashboard } from "@/hooks"

export function NetProfit() {
  const { data: dashboard } = useDashboard()

  return (
    <ChartCard
      title="Net Profit"
      majorValue={dashboard.total_pnl}
      majorValueFormatter={(value) => formatNum(value)}
      description="last 1y"
      minorValue1={dashboard.avg_profit}
      minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText1="avg. profit"
      minorValue2={dashboard.avg_expense}
      minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
      minorText2="avg. cost"
      chartComponent={ChartBarStacked}
      chartData={dashboard.profit_chart}
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
          color: "var(--chart-2)",
        },
        revenue: {
            label: "Revenue",
            color: "var(--chart-1)",
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