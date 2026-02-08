"use client"

import { useEffect, useState } from "react"
import { Areachart } from "@/components/charts/areachart"
import { formatNum } from "@/lib/utils"
import * as Card from "@/components/ui/card"
import { useReportsData } from "@/hooks/useReportsData"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"
import { format } from "date-fns"

interface ReturnChartProps {
  year: string
}

interface ChartPoint extends Record<string, string | number> {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
}

export function ReturnChart({ year }: ReturnChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { yearlyData, isLoading: isReportsLoading } = useReportsData()

  useEffect(() => {
    if (!year) return

    const controller = new AbortController()
    const fetchData = async () => {
      setIsFetching(true)
      setError(null)

      try {
        // Determine parameter for API
        const timeParam = year === "All Time" ? "all" : year

        const res = await fetch(`/api/gateway/return-chart-data?time=${timeParam}`, {
          signal: controller.signal,
        })

        if (!res.ok) {
          const errResult: unknown = await res.json().catch(() => null)
          const errMessage =
            typeof errResult === "object" &&
            errResult !== null &&
            "error" in errResult
              ? String((errResult as { error?: string }).error)
              : `Failed to fetch chart data (${res.status})`
          throw new Error(errMessage)
        }

        const rawData: unknown = await res.json()
        if (!Array.isArray(rawData)) {
          throw new Error("Unexpected response format: expected array")
        }

        const jsonData: ChartPoint[] = rawData.map((item) => {
          if (
            typeof item === "object" &&
            item !== null &&
            "portfolio_value" in item &&
            "vni_value" in item
          ) {
            const typedItem = item as Partial<ChartPoint>
            return {
              snapshot_date: String(typedItem.snapshot_date ?? typedItem.date ?? ""),
              portfolio_value: Number(typedItem.portfolio_value ?? 0),
              vni_value: Number(typedItem.vni_value ?? 0),
            }
          }
          throw new Error("Invalid item in response array")
        })

        setData(jsonData)
      } catch (err: unknown) {
        console.error(err)
        const message = err instanceof Error ? err.message : "Internal Server Error"
        setError(message)
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [year])

  const isLoading = isFetching || isReportsLoading

  if (isLoading) {
    return (
      <ChartCardSkeleton
        title="Equity Return"
        minorText1="VN-Index"
        tabswitch={false}
      />
    )
  }

  if (error) {
    return (
      <Card.Root variant="glow" className="relative flex flex-col gap-4 h-full">
        <Card.Header>
          <Card.Subtitle>Error</Card.Subtitle>
          <Card.Title className="text-red-500 text-lg">{error}</Card.Title>
        </Card.Header>
      </Card.Root>
    )
  }

  const yearNum = year === "All Time" ? "All-Time" : year
  const yearData = yearlyData.find((item) => item.year === yearNum)
  const equityReturn = yearData?.equity_ret ?? 0
  const vnIndexReturn = yearData?.vn_ret ?? 0

  return (
    <ChartCard
      title="Equity Return"
      majorValue={equityReturn}
      majorValueFormatter={(value) => `${formatNum(value, 1)}%`}
      minorValue1={vnIndexReturn}
      minorValue1Formatter={(value) => `${formatNum(value, 1)}%`}
      minorText1="VN-Index"
      chartComponent={Areachart}
      chartData={data}
      chartConfig={{
        portfolio_value: {
          label: "Equity",
          color: "var(--chart-2)",
        },
        vni_value: {
          label: "VN-Index",
          color: "var(--chart-1)",
        },
      }}
      chartClassName="h-full w-full pt-4"
      xAxisDataKey="snapshot_date"
      chartDataKeys={["portfolio_value", "vni_value"]}
      legend={true}
      yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
      xAxisTickFormatter={(value: string | number) => {
        const date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
        return year === "All Time" ? format(date, "MMM yyyy") : format(date, "dd MMM")
      }}
      tooltipValueFormatter={(value) => formatNum(value, 1)}
    />
  )
}
