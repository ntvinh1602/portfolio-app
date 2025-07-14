import { Linechart } from "@/components/charts/base-charts/linechart"
import { compactNum, formatNum } from "@/lib/utils"
import { format } from "date-fns"
import { useState, useEffect, useCallback } from "react"

type EquityData = {
  date: string
  net_equity_value: number
}

export function EquityChart({
  startDate,
  endDate,
  onLatestValue,
  height = "h-[150px]",
}: {
  startDate: Date
  endDate: Date
  onLatestValue?: (value: number) => void
  height?: string
}) {
  const [chartData, setChartData] = useState<EquityData[]>([])

  const fetchEquityData = useCallback(async () => {
    const equityParams = new URLSearchParams({
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      threshold: "200",
    })
    const equityResponse = await fetch(
      `/api/reporting/equity-chart?${equityParams.toString()}`
    )
    if (!equityResponse.ok) {
      const errorData = await equityResponse.json()
      throw new Error(errorData.error || "Failed to fetch equity data.")
    }
    const equityData = (await equityResponse.json()) as EquityData[]
    setChartData(equityData)
    if (onLatestValue && equityData && equityData.length > 0) {
      onLatestValue(equityData[equityData.length - 1].net_equity_value)
    }
  }, [startDate, endDate, onLatestValue])

  useEffect(() => {
    fetchEquityData()
  }, [fetchEquityData])

  return (
    <Linechart
      data={chartData}
      chartConfig={{
        net_equity_value: {
          label: "Equity",
          color: "var(--chart-1)",
        },
      }}
      className={`${height} w-full`}
      xAxisDataKey="date"
      lineDataKeys={["net_equity_value"]}
      grid={true}
      xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
      yAxisTickFormatter={(value) => compactNum(Number(value))}
    />
  )
}