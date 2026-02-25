import { format } from "date-fns"
import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"

interface ProfitChartPoint {
  snapshot_date: string
  tax: number
  fee: number
  interest: number
  revenue: number
  [key: string]: string | number
}

interface NetProfitProps {
  totalPnL: number
  avgProfit: number
  avgExpense: number
  profitChart: ProfitChartPoint[]
}

export function NetProfit({
  totalPnL,
  avgProfit,
  avgExpense,
  profitChart
}: NetProfitProps) {
  return (
    <ChartCard
      title="Net Profit"
      majorValue={totalPnL}
      majorValueFormatter={(value) => formatNum(value)}
      description={`last 1y`}
      minorValue1={avgProfit}
      minorValue1Formatter={(value) =>
        compactNum(Math.abs(value))
      }
      minorText1="avg. profit"
      minorValue2={avgExpense}
      minorValue2Formatter={(value) =>
        compactNum(Math.abs(value))
      }
      minorText2="avg. cost"
      chartComponent={ChartBarStacked}
      chartData={profitChart}
      chartConfig={{
        tax: { label: "Tax", color: "var(--chart-4)" },
        fee: { label: "Fee", color: "var(--chart-3)" },
        interest: { label: "Interest", color: "var(--chart-2)" },
        revenue: { label: "Revenue", color: "var(--chart-1)" }
      }}
      chartClassName="h-full w-full"
      chartDataKeys={["tax", "fee", "interest", "revenue"]}
      yAxisTickFormatter={(value) =>
        compactNum(Number(value))
      }
      xAxisTickFormatter={(value) =>
        format(new Date(value), "MMM yy")
      }
      tooltipValueFormatter={(value) =>
        formatNum(value)
      }
    />
  )
}