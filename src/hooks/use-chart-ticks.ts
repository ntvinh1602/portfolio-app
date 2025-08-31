import { useMemo } from "react"
import { parseISO, format } from "date-fns"

type ChartData = { snapshot_date: string; [key: string]: string | number }[]

export const useChartTicks = (
  chartData: ChartData,
  dateRange: string,
  maxTicks: number = 5
) => {
  const getTicks = (data: ChartData, maxTicks: number) => {
    if (!data || data.length === 0) {
      return []
    }
    if (data.length <= maxTicks) {
      return data.map(d => d.snapshot_date)
    }
    const ticks = [data[0].snapshot_date]
    const step = (data.length - 1) / (maxTicks - 1)
    for (let i = 1; i < maxTicks - 1; i++) {
      const index = Math.round(i * step)
      if (index < data.length - 1) {
        ticks.push(data[index].snapshot_date)
      }
    }
    ticks.push(data[data.length - 1].snapshot_date)
    return ticks
  }

  const ticks = useMemo(
    () => getTicks(chartData, maxTicks),
    [chartData, maxTicks]
  )

  const xAxisTickFormatter = (value: string | number) => {
    if (typeof value !== "string") {
      return value.toString()
    }
    const date = parseISO(value)
    if (isNaN(date.getTime())) {
      return value
    }
    switch (dateRange) {
      case "1y":
      case "all_time":
        return format(date, "MMM yy")
      default:
        return format(date, "dd MMM")
    }
  }

  return { ticks, xAxisTickFormatter }
}