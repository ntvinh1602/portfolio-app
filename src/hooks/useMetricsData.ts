import * as React from "react"
import { useMetricsCache } from "@/context/MetricsCacheContext"
import { startOfMonth, startOfYear } from "date-fns"

export function useMetricsData(dateRange: string) {
  const { data, isLoading, error, fetchDataForDateRange, firstSnapshotDate } = useMetricsCache()
  const [xAxisDateFormat, setXAxisDateFormat] = React.useState("MMM dd")

  React.useEffect(() => {
    fetchDataForDateRange(dateRange)
  }, [dateRange, fetchDataForDateRange])

  React.useEffect(() => {
    let format = "MMM dd"
    if (dateRange === "ytd" || dateRange === "all") {
      format = "MMM ''yy"
    }
    setXAxisDateFormat(format)
  }, [dateRange])

  const chartStartDate = React.useMemo(() => {
    const endDate = new Date()
    if (dateRange === "mtd") return startOfMonth(endDate)
    if (dateRange === "ytd") return startOfYear(endDate)
    if (dateRange === "all") return firstSnapshotDate
    return null
  }, [dateRange, firstSnapshotDate])

  return {
    cagr: data?.cagr ?? null,
    sharpeRatio: data?.sharpeRatio ?? null,
    totalPnl: data?.totalPnl ?? null,
    totalReturn: data?.totalReturn ?? null,
    benchmarkChartData: data?.benchmarkChartData ?? [],
    isBenchmarkChartLoading: isLoading,
    benchmarkChartError: error,
    xAxisDateFormat,
    chartStartDate, // This is now simplified
  }
}