import { TrendingUp, TrendingDown } from "lucide-react"
import { EquityChart } from "@/components/charts/equity-chart"
import { formatNum } from "@/lib/utils"
import { subDays, format } from "date-fns"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function EquityCard() {
  const [latestEquity, setLatestEquity] = useState<number | null>(null)
  const [twr, setTwr] = useState<number | null>(null)
  const { startDate, endDate } = useMemo(() => {
    const endDate = new Date()
    const startDate = subDays(endDate, 90)
    return { startDate, endDate }
  }, [])

  const fetchTWR = useCallback(async () => {
    setTwr(null)
    const twrParams = new URLSearchParams({
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
    })
    const twrResponse = await fetch(
      `/api/reporting/twr?${twrParams.toString()}`
    )
    if (!twrResponse.ok) {
      const errorData = await twrResponse.json()
      throw new Error(errorData.error || "Failed to fetch TWR data.")
    }
    const twrData = await twrResponse.json()
    setTwr(twrData.twr)
  }, [startDate, endDate])

  useEffect(() => {
    fetchTWR()
  }, [fetchTWR])

  return (
    <Card className="gap-4 h-full">
      <CardHeader className="px-4">
        <CardDescription>Total equity</CardDescription>
        <CardTitle className="text-2xl">
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
        <EquityChart
          startDate={startDate}
          endDate={endDate}
          onLatestValue={setLatestEquity}
          height="h-[180px]"
        />
      </CardFooter>
    </Card>
  )
}
