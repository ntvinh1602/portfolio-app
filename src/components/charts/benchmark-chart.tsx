"use client"

import { Linechart } from "@/components/charts/base-charts/linechart"
import { formatNum } from "@/lib/utils"
import { format } from "date-fns"
import { useState, useEffect, useCallback } from "react"

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

type BenchmarkChartProps = {
  startDate: Date
  endDate: Date
  height?: string
  xAxisDateFormat?: string
}

export function BenchmarkChart({
  startDate,
  endDate,
  height = "h-[210px]",
  xAxisDateFormat = "MMM dd",
}: BenchmarkChartProps) {
  const [chartData, setChartData] = useState<BenchmarkData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        threshold: "200",
      })

      const response = await fetch(
        `/api/query/benchmark-chart?${params.toString()}`
      )
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
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading) {
    return (
      <div className={`${height} w-full flex items-center justify-center`}>
        Loading chart...
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`${height} w-full flex items-center justify-center text-red-500`}
      >
        {error}
      </div>
    )
  }

  return (
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
        },
      }}
      className={`${height} w-full -ml-4`}
      xAxisDataKey="date"
      lineDataKeys={["portfolio_value", "vni_value"]}
      grid={true}
      legend={true}
      xAxisTickFormatter={(value) => format(new Date(value), xAxisDateFormat)}
      yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
    />
  )
}