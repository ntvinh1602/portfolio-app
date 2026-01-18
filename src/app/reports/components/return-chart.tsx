"use client"

import { Areachart } from "@/components/charts/areachart"
import { formatNum } from "@/lib/utils"
import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"

interface ReturnChartProps {
  year?: string | number
}

// Fix: extend Record<string, string | number> to satisfy Areachart
interface ChartPoint extends Record<string, string | number> {
  date: string
  portfolio_value: number
  vni_value: number
}

export function ReturnChart({ year }: ReturnChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          const errResult = await res.json().catch(() => null)
          throw new Error(errResult?.error || `Failed to fetch chart data (${res.status})`)
        }

        const jsonData: ChartPoint[] = await res.json()
        setData(jsonData)
      } catch (error) {
        console.error(error)
        const message = error instanceof Error ? error.message : "Internal Server Error"
        setError(message || "Unexpected error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [year])

  if (isLoading) {
    return (
      <Card.Root variant="glow" className="relative flex flex-col gap-4 h-full">
        <Card.Header className="items-center">
          <Card.Title className="text-2xl">
            Performance
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 h-full">
          <Skeleton className="w-full h-full" />
        </Card.Content>
      </Card.Root>
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

  return (
    <Card.Root variant="glow" className="relative flex flex-col gap-0 h-full">
      <Card.Header className="items-center">
        <Card.Title className="text-2xl">Performance</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4 h-full pt-4">
        <Areachart
          data={data} // now compatible
          config={{
            portfolio_value: {
              label: "Equity",
              color: "var(--chart-2)",
            },
            vni_value: {
              label: "VN-Index",
              color: "var(--chart-1)",
            },
          }}
          className="h-full w-full"
          xAxisDataKey="date"
          dataKeys={["portfolio_value", "vni_value"]}
          legend
          xAxisTickFormatter = {(value: string | number) => {
            if (!value) return ""
            const strValue = typeof value === "string" ? value : String(value)
            const date = new Date(strValue)
            return isNaN(date.getTime()) ? strValue : date.toLocaleString("en-US", { month: "short", year: "2-digit" })
          }}
          yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
          valueFormatter={(value) => formatNum(value, 1)}
        />
      </Card.Content>
    </Card.Root>
  )
}
