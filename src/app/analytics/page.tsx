"use client"

import * as React from "react"
import { startOfMonth, startOfYear, format as formatDate } from "date-fns"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import TabSwitcher from "@/components/tab-switcher"
import { TwoMetric } from "@/components/cards/two-metric"
import { calculateCAGR, calculateSharpeRatio } from "@/lib/utils"
import { BenchmarkChart } from "@/components/charts/benchmark-chart"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"

export default function Page() {
  const [dateRange, setDateRange] = React.useState("all")
  const [cagr, setCagr] = React.useState<number | null>(null)
  const [sharpeRatio, setSharpeRatio] = React.useState<number | null>(null)
  const [totalPnl, setTotalPnl] = React.useState<number | null>(null)
  const [totalReturn, setTotalReturn] = React.useState<number | null>(null)
  const [chartStartDate, setChartStartDate] = React.useState<Date | null>(null)
  const [xAxisDateFormat, setXAxisDateFormat] = React.useState("MMM dd")
  const [firstSnapshotDate, setFirstSnapshotDate] = React.useState<Date | null>(
    null
  )
  const endDate = React.useMemo(() => new Date(), [])

  // Fetch first snapshot date once
  React.useEffect(() => {
    const fetchFirstSnapshot = async () => {
      try {
        const res = await fetch("/api/query/first-snapshot-date")
        const data = await res.json()
        setFirstSnapshotDate(new Date(data.date))
      } catch (error) {
        console.error("Failed to fetch first snapshot date:", error)
      }
    }
    fetchFirstSnapshot()
  }, [])

  // Fetch lifetime metrics when first snapshot date is available
  React.useEffect(() => {
    if (!firstSnapshotDate) return

    const fetchData = async () => {
      try {
        const startDate = formatDate(firstSnapshotDate, "yyyy-MM-dd")
        const endDateStr = formatDate(endDate, "yyyy-MM-dd")

        const [performanceRes, twrRes] = await Promise.all([
          fetch(
            `/api/query/twr?start_date=${startDate}&end_date=${endDateStr}`
          ),
          fetch(
            `/api/query/monthly-twr?start_date=${startDate}&end_date=${endDateStr}`
          ),
        ])

        // Calculate CAGR
        const performance = await performanceRes.json()
        const years =
          (endDate.getTime() - firstSnapshotDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
        const cagrValue = calculateCAGR(1, 1 + performance.twr, years)
        setCagr(cagrValue)

        // Calculate Sharpe Ratio
        const twrData = await twrRes.json()
        const monthlyReturns = twrData.map(
          (item: { twr: number }) => item.twr
        )
        const sharpeRatioValue = calculateSharpeRatio(monthlyReturns, 0.055)
        setSharpeRatio(sharpeRatioValue)
      } catch (error) {
        console.error("Failed to fetch performance data:", error)
      }
    }

    fetchData()
  }, [firstSnapshotDate, endDate])

  // Update chart start date based on tab selection
  React.useEffect(() => {
    if (!firstSnapshotDate) return

    let start = firstSnapshotDate
    let format = "MMM dd"
    if (dateRange === "mtd") {
      start = startOfMonth(endDate)
    } else if (dateRange === "ytd") {
      start = startOfYear(endDate)
      format = "MMM ''yy"
    } else if (dateRange === "all") {
      format = "MMM ''yy"
    }
    setChartStartDate(start)
    setXAxisDateFormat(format)
  }, [dateRange, firstSnapshotDate, endDate])

  // Fetch P/L and TWR based on date range
  React.useEffect(() => {
    if (!chartStartDate) return

    const fetchData = async () => {
      try {
        const startDate = formatDate(chartStartDate, "yyyy-MM-dd")
        const endDateStr = formatDate(endDate, "yyyy-MM-dd")

        const [pnlRes, twrRes] = await Promise.all([
          fetch(
            `/api/query/pnl?start_date=${startDate}&end_date=${endDateStr}`
          ),
          fetch(
            `/api/query/twr?start_date=${startDate}&end_date=${endDateStr}`
          ),
        ])

        const pnlData = await pnlRes.json()
        setTotalPnl(pnlData.pnl)

        const twrData = await twrRes.json()
        setTotalReturn(twrData.twr)
      } catch (error) {
        console.error("Failed to fetch P/L or TWR data:", error)
      }
    }

    fetchData()
  }, [chartStartDate, endDate])

  const tabOptions = [
    { value: "mtd", label: "This Month" },
    { value: "ytd", label: "This Year" },
    { value: "all", label: "All Time" },
  ]

  return (
    <PageMain>
      <PageHeader title="Analytics" />
      <PageContent className="gap-2">
        <TwoMetric
          title="Metrics"
          subtitle="Key indicators of investment efficiency"
          label1="CAGR"
          value1={cagr !== null ? `${cagr.toFixed(2)}%` : "Loading..."}
          label2="Sharpe Ratio"
          value2={
            sharpeRatio !== null ? sharpeRatio.toFixed(2) : "Loading..."
          }
          icon={false}
        />
        <TabSwitcher
          options={tabOptions}
          onValueChange={setDateRange}
          value={dateRange}
          defaultValue="all"
        />
        <TwoMetric
          title="Earnings"
          title_url="/analytics/earnings"
          subtitle="Net profit and time-weighted return of equity"
          label1="Net P/L"
          value1={
            totalPnl !== null
              ? `${formatNum(totalPnl)}`
              : "Loading..."
          }
          label2="Return"
          value2={
            totalReturn !== null
              ? `${formatNum(100*totalReturn, 2)}%`
              : "Loading..."
          }
          icon={false}
        />
        <Card className="gap-6">
          <CardHeader>
            <CardTitle>Benchmark</CardTitle>
            <CardDescription>
              Visualized performance against VN-Index
            </CardDescription>
          </CardHeader>
          {chartStartDate && (
            <BenchmarkChart
              startDate={chartStartDate}
              endDate={endDate}
              height="h-[250px]"
              xAxisDateFormat={xAxisDateFormat}
            />
          )}
        </Card>
      </PageContent>
    </PageMain>
  )
}
