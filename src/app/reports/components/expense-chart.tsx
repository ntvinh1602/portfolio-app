import * as Card from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { compactNum } from "@/lib/utils"
import { useDelayedData } from "@/hooks/useDelayedData"

export function ExpenseChart({
  year,
  className
}: {
  year: string
  className?: string
}) {
  const { monthlyData: AllTimeData, isLoading } = useDelayedData()

  if (isLoading) return (
    <Card.Root className="gap-0">
      <Card.Header>
        <Card.Title>Expenses</Card.Title>
      </Card.Header>
      <Card.Content className="px-0 flex w-full justify-between">
        <div className="flex w-full justify-between">
          <Skeleton className="size-40 aspect-square rounded-full" />
          <div className="flex flex-col w-full gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-10" />
            ))}
          </div>
        </div>
      </Card.Content>
    </Card.Root>
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

  const expenseChartCfg = {
    tax: {
      label: "Taxes",
      color: "var(--chart-1)",
    },
    fee: {
      label: "Fee",
      color: "var(--chart-2)",
    },
    interest: {
      label: "Interest",
      color: "var(--chart-3)",
    }
  } satisfies ChartConfig

  const expenseChartData = [
    {
      liability: "tax",
      allocation: filteredData.reduce((acc, curr) => acc - curr.tax, 0),
      fill: "var(--chart-1)",
    },
    {
      liability: "fee",
      allocation: filteredData.reduce((acc, curr) => acc - curr.fee, 0),
      fill: "var(--chart-2)",
    },
    {
      liability: "interest",
      allocation: filteredData.reduce((acc, curr) => acc - curr.interest, 0),
      fill: "var(--chart-3)",
    }
  ].filter((d) => d.allocation > 0)

  const totalExpenses = filteredData.reduce((acc, curr) => acc - curr.fee - curr.tax - curr.interest, 0)

  return (
    <Card.Root variant="glow" className={`gap-0 ${className}`}>
      <Card.Header>
        <Card.Title className="text-xl">Expenses</Card.Title>
      </Card.Header>
      <Card.Content className="px-0 -ml-4 flex w-full justify-between">
        <Piechart
          data={expenseChartData}
          chartConfig={expenseChartCfg}
          dataKey={"allocation"}
          nameKey="liability"
          className="h-[200px] w-full"
          innerRadius={70}
          legend="right"
          label={true}
          label_pos={2.2}
          margin_tb={1}
          centerText="Total Expenses"
          centerValue={compactNum(totalExpenses)}
        />
      </Card.Content>
    </Card.Root>
  )
}