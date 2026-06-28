"use client"

import { formatNum, compactNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card, CardContent } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import type { Dashboard, ReturnChartPt } from "@fund/fund.types"
import { returnChart } from "@fund/config"

interface Props {
  dateRange: string
  chartData: {
    all: ReturnChartPt[]
    last_1y: ReturnChartPt[]
    last_6m: ReturnChartPt[]
    last_3m: ReturnChartPt[]
  }
  data: Dashboard
}

export function ReturnChart({ dateRange, chartData, data }: Props) {
  const chartTimeframe =
    chartData[dateRange as keyof typeof chartData] ?? chartData.last_1y

  const xAxisTickFormatter = (value: string) => {
    const date = parseISO(value)
    return ["last_1y", "all"].includes(dateRange)
      ? format(date, "MMM yyyy")
      : format(date, "dd MMM")
  }

  return (
    <Card>
      <ChartCardHeader
        title="Return"
        titleLegend="this year"
        heroStat={`${formatNum(data.twr_ytd * 100, 1)}%`}
        stat1={data.twr_all}
        formattedStat1={`${formatNum(data.twr_all * 100, 1)}%`}
        descriptionStat1="all time"
        stat2={data.cagr}
        formattedStat2={`${formatNum(data.cagr * 100, 1)}%`}
        descriptionStat2="annualized"
      />
      <Areachart
        data={chartTimeframe}
        config={returnChart}
        xAxisDataKey={"snapshot_date"}
        className="w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={(v) => formatNum(v, 1)}
      />
    </Card>
  )
}
