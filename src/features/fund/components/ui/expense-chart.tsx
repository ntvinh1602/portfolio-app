import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { HandCoins } from "lucide-react"

interface Props {
  name: string
  totalExpenses: string
  chartData: Record<string, unknown>[]
}

export function ExpenseChart({ name, totalExpenses, chartData }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{name}</CardDescription>
        <CardTitle className="text-base sm:text-xl">{totalExpenses}</CardTitle>
        <CardAction>
          <HandCoins className="stroke-1" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Piechart
          data={chartData}
          chartConfig={{
            tax: { label: "Tax", color: "var(--chart-4)" },
            fee: { label: "Fee", color: "var(--chart-3)" },
            interest: { label: "Interest", color: "var(--chart-1)" },
          }}
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
