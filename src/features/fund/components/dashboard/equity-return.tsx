"use client"

import { useState } from "react"
import { parseISO, format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"
import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ChartCardHeader,
  ChartHeaderProps,
} from "@/components/charts/chartcard-header"
import type { Dashboard, EquityChartPt, ReturnChartPt } from "@fund/fund.types"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { equityChart, returnChart } from "@fund/config"

type ChartDataPoint = { snapshot_date: string; [key: string]: string | number }

interface DashboardChartProps<T extends ChartDataPoint> {
  dateRange: string
  chartData: {
    all: T[]
    last_1y: T[]
    last_6m: T[]
    last_3m: T[]
  }
  config: ChartConfig
  header: ChartHeaderProps
  tooltipFormatter?: (value: number) => string
}

function DashboardChart<T extends ChartDataPoint>({
  dateRange,
  chartData,
  config,
  header,
  tooltipFormatter = (v) => formatNum(v),
}: DashboardChartProps<T>) {
  const chartTimeframe: T[] =
    chartData[dateRange as keyof typeof chartData] ?? chartData.last_1y

  const xAxisTickFormatter = (value: string) => {
    const date = parseISO(value)
    if (isNaN(date.getTime())) return value
    switch (dateRange) {
      case "last_1y":
      case "all":
        return format(date, "MMM yyyy")
      default:
        return format(date, "dd MMM")
    }
  }

  return (
    <Card>
      <ChartCardHeader
        title={header.title}
        descriptionTitle={header.descriptionTitle}
        heroStat={header.heroStat}
        stat1={header.stat1}
        formattedStat1={header.formattedStat1}
        descriptionStat1={header.descriptionStat1}
        stat2={header.stat2}
        formattedStat2={header.formattedStat2}
        descriptionStat2={header.descriptionStat2}
      />
      <CardContent>
        <Areachart
          data={chartTimeframe}
          config={config}
          xAxisDataKey={"snapshot_date"}
          className="w-full"
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(v) => compactNum(v)}
          tooltipFormatter={tooltipFormatter}
        />
      </CardContent>
    </Card>
  )
}

export default function EquityReturn({ data }: { data: Dashboard }) {
  const [dateRange, setDateRange] = useState("last_1y")
  return (
    <div className="@container/main flex flex-col gap-4">
      <div className="flex bg-card gap-2 p-1 rounded-4xl items-center">
        <Button variant="ghost" size="icon-lg" className="pointer-events-none">
          <Calendar />
        </Button>
        <ToggleGroup
          type="single"
          value={dateRange}
          onValueChange={setDateRange}
          spacing={1}
          className="w-full"
        >
          <ToggleGroupItem value="last_3m" className="flex-1">
            3 months
          </ToggleGroupItem>
          <ToggleGroupItem value="last_6m" className="flex-1">
            6 months
          </ToggleGroupItem>
          <ToggleGroupItem value="last_1y" className="flex-1">
            1 year
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="flex-1">
            All time
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <DashboardChart<EquityChartPt>
        dateRange={dateRange}
        chartData={data.equitychart}
        config={equityChart}
        header={{
          title: "Equity",
          heroStat: formatNum(data.total_equity),
          stat1: data.pnl_mtd,
          formattedStat1: compactNum(Math.abs(data.pnl_mtd)),
          descriptionStat1: "this month",
          stat2: data.pnl_ytd,
          formattedStat2: compactNum(Math.abs(data.pnl_ytd)),
          descriptionStat2: "this year",
        }}
      />
      <DashboardChart<ReturnChartPt>
        dateRange={dateRange}
        chartData={data.returnchart}
        config={returnChart}
        header={{
          title: "Return",
          descriptionTitle: "this year",
          heroStat: `${formatNum(data.twr_ytd * 100, 1)}%`,
          stat1: data.twr_all,
          formattedStat1: `${formatNum(data.twr_all * 100, 1)}%`,
          descriptionStat1: "all time",
          stat2: data.cagr,
          formattedStat2: `${formatNum(data.cagr * 100, 1)}%`,
          descriptionStat2: "annualized",
        }}
        tooltipFormatter={(v) => formatNum(v, 1)}
      />
    </div>
  )
}
