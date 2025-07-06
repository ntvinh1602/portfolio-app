import { TrendingUp, TrendingDown } from "lucide-react"
import { Linechart } from "@/components/charts/linechart"

import { formatNum } from "@/lib/utils"
import { subDays, format } from "date-fns"
import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type EquityData = {
  date: string
  net_equity_value: number
}

export function EquityCard() {
  const [chartData, setChartData] = useState<EquityData[]>([])
  const [latestEquity, setLatestEquity] = useState<number | null>(null)
  const [twr, setTwr] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    const startDate = subDays(new Date(), 90)
    const endDate = new Date()
    setTwr(null)
    setChartData([])
    setLatestEquity(null)

    // Fetch TWR
    const twrParams = new URLSearchParams({
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
    })
    const twrResponse = await fetch(`/api/performance?${twrParams.toString()}`)
    if (!twrResponse.ok) {
      const errorData = await twrResponse.json()
      throw new Error(errorData.error || "Failed to fetch TWR data.")
    }
    const twrData = await twrResponse.json()
    setTwr(twrData.twr)

    // Fetch Equity Chart Data
    const equityParams = new URLSearchParams({
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      threshold: "200",
    })
    const equityResponse = await fetch(
      `/api/performance/equity?${equityParams.toString()}`
    )
    if (!equityResponse.ok) {
      const errorData = await equityResponse.json()
      throw new Error(errorData.error || "Failed to fetch equity data.")
    }
    const equityData = await equityResponse.json()
    if (equityData && equityData.length > 0) {
      setLatestEquity(equityData[equityData.length - 1].net_equity_value)
    }
    setChartData(equityData)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <Card className="bg-muted/50 shadow-none gap-4">
      <CardHeader className="px-4">
        <CardDescription>Total equity</CardDescription>
        <CardTitle className="text-2xl font-semibold">
          {latestEquity ? formatNum(latestEquity) : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Badge variant="outline">
            {twr !== null && twr < 0 ? (
              <TrendingDown className="size-4 text-red-700 dark:text-red-400" />
            ) : (
              <TrendingUp className="size-4 text-green-700 dark:text-green-400" />
            )}
            {twr !== null && `${(twr * 100).toFixed(2)}% `}
          </Badge>
          <CardDescription className="text-xs">Last 90 days</CardDescription>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-4">
        <Linechart
          data={chartData}
          chartConfig={{
            net_equity_value: {
              label: "Equity",
              color: "var(--chart-2)",
            },
          }}
          className="h-[150px] w-full"
          xAxisDataKey="date"
          lineDataKey="net_equity_value"
          grid={true}
          xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
          yAxisTickFormatter={(value) => `${formatNum(Number(value) / 1000000)}m`}
        />
      </CardFooter>
    </Card>
  )
}
