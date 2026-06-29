import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { expenseChart } from "../../config"
import { formatNum } from "@/lib/utils"
import { HandCoins } from "lucide-react"
import type { ProfitChartCols } from "@fund/fund.types"

export function ExpenseChart({
  profitChart,
}: {
  profitChart: ProfitChartCols
}) {
  // Each series is stored negative (e.g. -fee); negate the sum to get a positive total.
  const sum = (xs: number[]) => xs.reduce((acc, n) => acc + (n || 0), 0)

  const totalTax = -sum(profitChart.tax)
  const totalFee = -sum(profitChart.fee)
  const totalInterest = -sum(profitChart.interest)
  const totalExpenses = totalTax + totalFee + totalInterest

  const expenseChartData = [
    { liability: "tax", allocation: totalTax },
    { liability: "fee", allocation: totalFee },
    { liability: "interest", allocation: totalInterest },
  ].filter((d) => d.allocation > 0)

  return (
    <Card>
      <CardHeader>
        <CardDescription>Total Expenses</CardDescription>
        <CardTitle className="text-base sm:text-xl">
          {formatNum(totalExpenses)}
        </CardTitle>
        <CardAction>
          <HandCoins className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Piechart
          data={expenseChartData}
          chartConfig={expenseChart}
          dataKey="allocation"
          nameKey="liability"
          className="w-full max-h-50"
          innerRadius={60}
          legend="right"
          label_pos={1.5}
          margin_tb={1}
        />
      </CardContent>
    </Card>
  )
}
