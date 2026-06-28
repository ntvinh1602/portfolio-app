"use client"

import { formatNum, compactNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import type { Dashboard, EquityChartPt } from "@fund/fund.types"
import { equityChart } from "@fund/config"

interface Props {
  dateRange: string
  chartData: {
    all: EquityChartPt[]
    last_1y: EquityChartPt[]
    last_6m: EquityChartPt[]
    last_3m: EquityChartPt[]
  }
  data: Dashboard
}

export function EquityChart({ dateRange, chartData, data }: Props) {
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
        title="Equity"
        heroStat={formatNum(data.total_equity)}
        stat1={data.pnl_mtd}
        formattedStat1={compactNum(Math.abs(data.pnl_mtd))}
        descriptionStat1="this month"
        stat2={data.pnl_ytd}
        formattedStat2={compactNum(Math.abs(data.pnl_ytd))}
        descriptionStat2="this year"
      />
      <Areachart
        data={chartTimeframe}
        config={equityChart}
        xAxisDataKey={"snapshot_date"}
        className="w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
      />
    </Card>
  )
}
