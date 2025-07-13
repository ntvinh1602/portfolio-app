"use client"

import * as React from "react"
import { Piechart } from "@/components/charts/base-charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { format } from "date-fns"

type MonthlyExpenseData = {
  month: string
  trading_fees: number
  taxes: number
  interest: number
}

type PieChartDataItem = {
  name: string
  value: number
  fill: string
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

export function ExpenseStructureChart() {
  const [chartData, setChartData] = React.useState<PieChartDataItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const firstDateResponse = await fetch(
          "/api/reporting/first-snapshot-date"
        )
        if (!firstDateResponse.ok) {
          throw new Error("Failed to fetch first snapshot date")
        }
        const { date: startDate } = await firstDateResponse.json()

        const params = new URLSearchParams({
          start_date: startDate,
          end_date: format(new Date(), "yyyy-MM-dd"),
        })

        const response = await fetch(
          `/api/reporting/monthly-expenses?${params.toString()}`
        )
        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }
        const data: MonthlyExpenseData[] = await response.json()

        const aggregatedData = data.reduce(
          (acc, curr) => {
            acc.trading_fees += curr.trading_fees
            acc.taxes += curr.taxes
            acc.interest += curr.interest
            return acc
          },
          { trading_fees: 0, taxes: 0, interest: 0 }
        )

        const formattedForPie = Object.entries(aggregatedData).map(
          ([key, value]) => ({
            name: key,
            value,
            fill: chartConfig[key as keyof typeof chartConfig].color,
          })
        )

        setChartData(formattedForPie)
      } catch (error) {
        console.error("Error fetching expenses data:", error)
        setChartData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <Piechart
      data={chartData}
      chartConfig={chartConfig}
      dataKey="value"
      nameKey="name"
      className="h-[250px] w-full"
      legend="right"
      label={true}
      centerText="Total"
    />
  )
}