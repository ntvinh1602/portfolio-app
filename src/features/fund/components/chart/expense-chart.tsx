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

interface Props {
  totalExpenses: number
  chartData: Record<string, unknown>[]
}

export function ExpenseChart({ totalExpenses, chartData }: Props) {
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
          data={chartData}
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
