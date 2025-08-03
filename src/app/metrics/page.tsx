"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { TwoMetric } from "@/components/cards/two-metric"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Linechart, LinechartSkeleton } from "@/components/charts/linechart"
import { ChartConfig } from "@/components/ui/chart"
import { format as formatDate } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"


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
  const router = useRouter()
  const handleNavigation = () => {
      router.push("/earnings")
    }
  
  const [dateRange, setDateRange] = React.useState("all")
  const {
    cagr,
    sharpeRatio,
    ytdReturnData,
    lifetimeReturnData,
    lifetimePnLData,
    ytdPnLData,
    ytdBenchmarkData,
    lifetimeBenchmarkData,
    isLoading,
    error,
  } = useDashboardData()

  const totalPnl = dateRange === "ytd" ? ytdPnLData : lifetimePnLData
  const totalReturn = dateRange === "ytd" ? ytdReturnData : lifetimeReturnData
  const xAxisDateFormat = "MMM ''yy"
  const chartData = dateRange === "ytd" ? ytdBenchmarkData : lifetimeBenchmarkData

  return (
    <PageMain>
      <PageHeader title="Key Metrics" />
      <PageContent className="gap-6">
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
        <div className="flex flex-col gap-6 rounded-2xl px-0">
          <Card className="border-0 py-0">
            <CardHeader className="px-0">
              <div
                className="flex items-center"
                onClick={handleNavigation}
              >
                <CardTitle>Earnings</CardTitle>
                <ChevronRight className="size-4"/>
              </div>
              <CardDescription>Profit and Return on Equity</CardDescription>
              <CardAction>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger size="default" className="w-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ytd">This Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </CardAction>
            </CardHeader>
            <CardContent className="flex">
              <div className="flex flex-col w-full items-center">
                <CardDescription>Net P/L</CardDescription>
                <CardTitle className="flex text-xl gap-1 items-center">
                  {
                    totalPnl === null
                      ? <span className="animate-pulse">Loading...</span>
                      : `${formatNum(totalPnl)}`
                  }
                </CardTitle>
              </div>
              <div className="h-12 px-6">
                <Separator orientation="vertical" />
              </div>
              <div className="flex flex-col w-full items-center">
                <CardDescription>Return</CardDescription>
                <CardTitle className="flex text-xl gap-1 items-center">
                  {
                    totalReturn === null
                      ? <span className="animate-pulse">Loading...</span>
                      : `${formatNum(totalReturn*100, 2)}%`
                  }
                </CardTitle>
              </div>
            </CardContent>
          </Card>
          <Card className="gap-6 border-0 py-0">
            <CardHeader className="px-0">
              <CardTitle>Benchmark</CardTitle>
              <CardDescription>
                Visualized performance against VN-Index
              </CardDescription>
            </CardHeader>
            {isLoading && (
              <div className="h-[250px] w-full">
                <LinechartSkeleton />
              </div>
            )}
            {error && (
              <div className="h-[250px] w-full flex items-center justify-center text-red-500">
                {error.message}
              </div>
            )}
            {!isLoading && !error && (
              <Linechart
                data={chartData}
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
        </div>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}
