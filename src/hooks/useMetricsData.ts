import * as React from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { startOfMonth, startOfYear, format as formatDate } from "date-fns"

export function useMetricsData(dateRange: string) {
  const [firstSnapshotDate, setFirstSnapshotDate] = React.useState<Date | null>(null)
  const { data: firstSnapshotDateData } = useSWR("/api/query/first-snapshot-date", fetcher)

  React.useEffect(() => {
    if (firstSnapshotDateData) {
      setFirstSnapshotDate(new Date(firstSnapshotDateData.date))
    }
  }, [firstSnapshotDateData])

  const { data, error, isLoading } = useSWR(
    () => {
      if (!firstSnapshotDate) return null

      const endDate = new Date()
      let startDate = firstSnapshotDate
      if (dateRange === "mtd") {
        startDate = startOfMonth(endDate)
      } else if (dateRange === "ytd") {
        startDate = startOfYear(endDate)
      }

      const params = new URLSearchParams({
        start_date: formatDate(startDate, "yyyy-MM-dd"),
        end_date: formatDate(endDate, "yyyy-MM-dd"),
        lifetime_start_date: formatDate(firstSnapshotDate, "yyyy-MM-dd"),
      })

      return `/api/gateway/metrics?${params.toString()}`
    },
    fetcher
  )

  const xAxisDateFormat = React.useMemo(() => {
    if (dateRange === "ytd" || dateRange === "all") {
      return "MMM ''yy"
    }
    return "MMM dd"
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
    chartStartDate,
  }
}