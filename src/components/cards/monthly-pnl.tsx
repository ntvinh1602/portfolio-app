import { BarChart } from "../charts/base-charts/barchart"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { ChartConfig } from "../ui/chart"
import { Badge } from "@/components/ui/badge"
import { subMonths, format, startOfMonth } from "date-fns"
import { useState, useEffect } from "react"
import { formatNum } from "@/lib/utils"

export type MonthlyPnlData = {
  month: string
  pnl: number
}

const chartConfig = {
  pnl: {
    label: "PnL",
  },
} satisfies ChartConfig

export function PnLCard() {
  const [chartData, setChartData] = useState<MonthlyPnlData[]>([])
  const [mtdPnl, setMtdPnl] = useState<number | null>(null)
  const [avgPnl, setAvgPnl] = useState<number | null>(null)

  const fetchData = async () => {
    const today = new Date()
    const endDate = new Date()
    const startDate = startOfMonth(subMonths(today, 11))

    const params = new URLSearchParams({
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
    })

    const response = await fetch(`/api/reporting/monthly-pnl?${params.toString()}`)
    if (!response.ok) {
      console.error("Failed to fetch PnL data")
      return
    }

    const data: MonthlyPnlData[] = await response.json()
    setChartData(data)

    if (data.length > 0) {
      const currentMonthPnl = data[data.length - 1].pnl
      setMtdPnl(currentMonthPnl)

      const totalPnl = data.reduce((acc, item) => acc + item.pnl, 0)
      setAvgPnl(totalPnl / data.length)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Card className="bg-muted/50 shadow-none gap-4 h-full">
      <CardHeader className="px-4">
        <CardDescription>This month P/L</CardDescription>
        <CardTitle className="text-2xl">
          {mtdPnl !== null ? formatNum(mtdPnl) : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Badge variant="outline">
            {avgPnl !== null ? formatNum(avgPnl) : "..."}
          </Badge>
          <CardDescription className="text-xs">12-month avg.</CardDescription>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-4">
        <BarChart
          data={chartData}
          config={chartConfig}
          dataKey="pnl"
          categoryKey="month"
          className="h-full w-full"
          yAxisTickFormatter={(value) => {
            const numericValue =
              typeof value === "string" ? parseFloat(value) : value
            return `${formatNum(numericValue / 1000000)}m`
          }}
        />
      </CardFooter>
    </Card>
  )
}