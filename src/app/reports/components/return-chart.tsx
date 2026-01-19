"use client"

import { Areachart } from "@/components/charts/areachart"
import { formatNum } from "@/lib/utils"
import * as Card from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useReportsData } from "@/hooks/useReportsData"
import { ChartCard, ChartCardSkeleton } from "@/components/chart-card"

interface ReturnChartProps {
  year?: string | number
}

interface ChartPoint extends Record<string, string | number> {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
}

export function ReturnChart({ year }: ReturnChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { annualReturn, isLoading: isReportsLoading } = useReportsData()

  useEffect(() => {
    if (!year) return

    const controller = new AbortController()

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/gateway/annual-chart?year=${year}`, {
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
      } catch (error: unknown) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : "Internal Server Error"
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [year])

  if (isLoading || isReportsLoading) {
    return (
      <ChartCardSkeleton
        description="Equity Return"
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

  const key = year === "All Time" ? "All-Time" : String(year)
  const currentData =
    annualReturn[key] ??
    Object.entries(annualReturn)
      .sort((a, b) => {
        const aNum = a[0] === "All-Time" ? Infinity : Number(a[0])
        const bNum = b[0] === "All-Time" ? Infinity : Number(b[0])
        return bNum - aNum
      })[0]?.[1] ??
    null

  const equityReturn =
    typeof currentData?.equity_return === "number"
      ? currentData.equity_return
      : null
  const vnIndexReturn =
    typeof currentData?.vnindex_return === "number"
      ? currentData.vnindex_return
      : null

  return (
    <ChartCard
      description="Equity Return"
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
      xAxisTickFormatter={(value: string | number) => {
        if (!value) return ""
        const strValue = typeof value === "string" ? value : String(value)
        const date = new Date(strValue)
        return isNaN(date.getTime())
          ? strValue
          : date.toLocaleString("en-US", { month: "short", year: "2-digit" })
      }}
      yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
      tooltipValueFormatter={(value) => formatNum(value, 1)}
    />
  )
}
