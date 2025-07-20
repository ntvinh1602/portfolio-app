"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import TabSwitcher from "@/components/tab-switcher"
import { TwoMetric } from "@/components/cards/two-metric"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useMetricsData } from "@/hooks/useMetricsData"
import { Linechart, LinechartSkeleton } from "@/components/charts/linechart"
import { ChartConfig } from "@/components/ui/chart"
import { format as formatDate } from "date-fns"


const benchmarkChartConfig = {
  portfolio_value: {
    label: "Equity",
    color: "var(--chart-1)",
  },
  vni_value: {
    label: "VN-Index",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export default function Page() {
  const [dateRange, setDateRange] = React.useState("all")
  const {
    cagr,
    sharpeRatio,
    totalPnl,
    totalReturn,
    chartStartDate,
    xAxisDateFormat,
    benchmarkChartData,
    isBenchmarkChartLoading,
    benchmarkChartError,
  } = useMetricsData(dateRange)

  const tabOptions = [
    { value: "mtd", label: "This Month" },
    { value: "ytd", label: "This Year" },
    { value: "all", label: "All Time" },
  ]

  return (
    <PageMain>
      <PageHeader title="Key Metrics" />
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
          title_url="/earnings"
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
          {isBenchmarkChartLoading && (
            <div className="h-[250px] px-4 w-full">
              <LinechartSkeleton />
            </div>
          )}
          {benchmarkChartError && (
            <div className="h-[250px] w-full flex items-center justify-center text-red-500">
              {benchmarkChartError}
            </div>
          )}
          {chartStartDate && !isBenchmarkChartLoading && !benchmarkChartError && (
            <Linechart
              data={benchmarkChartData}
              chartConfig={benchmarkChartConfig}
              className="h-[250px] w-full -ml-4"
              xAxisDataKey="date"
              lineDataKeys={["portfolio_value", "vni_value"]}
              grid={true}
              legend={true}
              xAxisTickFormatter={(value) => formatDate(new Date(value), xAxisDateFormat)}
              yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
            />
          )}
        </Card>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}
