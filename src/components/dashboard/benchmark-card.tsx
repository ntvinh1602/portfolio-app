"use client"

import { Linechart } from "@/components/charts/linechart"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { subDays, format } from "date-fns"
import { useState, useEffect, useCallback } from "react"

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

export function BenchmarkCard() {
  const [chartData, setChartData] = useState<BenchmarkData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const startDate = subDays(new Date(), 90)
      const endDate = new Date()

      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      })

      const response = await fetch(`/api/performance/benchmark?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch benchmark data.")
      }

      const data = await response.json()
      setChartData(data)
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message)
      } else {
        setError("An unknown error occurred.")
      }
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <Card className="bg-muted/50 shadow-none gap-2 h-full">
      <CardHeader className="px-4">
        <CardDescription>Last 90 days vs. VN-Index</CardDescription>
        <CardTitle className="text-2xl"></CardTitle>
      </CardHeader>
      <CardFooter className="px-4">
        {isLoading ? (
          <div className="h-[150px] w-full flex items-center justify-center">
            Loading chart...
          </div>
        ) : error ? (
          <div className="h-[150px] w-full flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          <Linechart
            data={chartData}
            chartConfig={{
              portfolio_value: {
                label: "Equity",
                color: "var(--chart-1)",
              },
              vni_value: {
                label: "VN-Index",
                color: "var(--chart-2)",
              }
            }}
            className="h-[190px] w-full -ml-4"
            xAxisDataKey="date"
            lineDataKeys={["portfolio_value", "vni_value"]}
            grid={true}
            legend={true}
            xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
            yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
          />
        )}
      </CardFooter>
    </Card>
  )
}