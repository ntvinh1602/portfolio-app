"use client"

import { formatNum, compactNum, pctNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { benchmarkChart } from "@fund/config"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"

interface Props {
  dateRange: string
  chartTimeframe: Record<string, string | number>[]
  twrYtd: number
  twrAll: number
  cagr: number
}

export function ReturnChart({
  dateRange,
  chartTimeframe,
  twrYtd,
  twrAll,
  cagr,
}: Props) {
  const xAxisTickFormatter = (ms: number) =>
    ["last_1y", "all"].includes(dateRange)
      ? format(new Date(ms), "MMM yyyy")
      : format(new Date(ms), "dd MMM")
  const tooltipLabelFormatter: TooltipLabelFormatter = (_label, payload) => {
    const ms = payload?.[0]?.payload?.t as number | undefined
    if (ms == null) return ""
    return format(new Date(ms), "yyyy-MM-dd")
  }
  return (
    <Card>
      <ChartCardHeader
        title="Return"
        titleLegend="this year"
        heroStat={pctNum(twrYtd)}
        stat1={twrAll}
        formattedStat1={pctNum(twrAll)}
        descriptionStat1="all time"
        stat2={cagr}
        formattedStat2={pctNum(cagr)}
        descriptionStat2="annualized"
      />
      <Areachart
        data={chartTimeframe}
        config={benchmarkChart}
        xAxisDataKey={"t"}
        xAxisType="number"
        className="w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={(v: number) => formatNum(v, 2)}
        tooltipLabelFormatter={tooltipLabelFormatter}
      />
    </Card>
  )
}
