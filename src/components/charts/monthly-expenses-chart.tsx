"use client"

import * as React from "react"
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns"
import {
  ChartBarStacked,
  BarStackedSkeleton
} from "@/components/charts/base-charts/stacked-barchart"
import { ChartConfig } from "@/components/ui/chart"

type MonthlyExpenseData = {
  month: string
  trading_fees: number
  taxes: number
  interest: number
}

const chartConfig = {
  trading_fees: {
    label: "Fees",
    color: "var(--chart-1)",
  },
  taxes: {
    label: "Taxes",
    color: "var(--chart-2)",
  },
  interest: {
    label: "Interest",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function ExpensesChart() {
  const [chartData, setChartData] = React.useState<MonthlyExpenseData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)

      const today = new Date()
      const endDate = endOfMonth(today)
      const startDate = startOfMonth(subMonths(today, 11))

      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      })

      try {
        const response = await fetch(
          `/api/reporting/monthly-expenses?${params.toString()}`
        )
        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }
        const data = await response.json()
        setChartData(data)
      } catch (error) {
        console.error("Error fetching expenses data:", error)
        setChartData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const formattedData = chartData
    .slice()
    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
    .map(item => {
      const total = item.trading_fees + item.taxes + item.interest
      return {
        ...item,
        month: format(new Date(item.month), "MMM ''yy"),
        total,
      }
    })

  // TODO: Add a skeleton loader
  if (isLoading) {
    return <BarStackedSkeleton />
  }

  return (
    <ChartBarStacked
      data={formattedData}
      config={chartConfig}
      labelKey="total"
      className="h-[360px] w-full"
    />
  )
}