"use client"

import { formatNum, compactNum, pctNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { benchmarkChart } from "../../config"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"

interface Props {
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartRows: Record<string, string | number>[]
}

export function BenchmarkChart({
  year,
  equityReturn,
  vnIndexReturn,
  chartRows,
}: Props) {

  const xAxisTickFormatter = (ms: number) =>
    year === 9999
      ? format(new Date(ms), "MMM yyyy")
      : format(new Date(ms), "dd MMM")
      
  const tooltipLabelFormatter: TooltipLabelFormatter = (_label, payload) => {
    const ms = payload?.[0]?.payload?.t as number | undefined
    if (ms == null) return ""
    return year === 9999
      ? format(new Date(ms), "MMM yyyy")
      : format(new Date(ms), "dd MMM")
  }

  return (
    <Card>
      <ChartCardHeader
        title="Alpha"
        heroStat={pctNum(equityReturn - vnIndexReturn)}
        stat1={equityReturn}
        formattedStat1={pctNum(Math.abs(equityReturn))}
        descriptionStat1="equity return"
        stat2={vnIndexReturn}
        formattedStat2={pctNum(Math.abs(vnIndexReturn))}
        descriptionStat2="VNI return"
      />
      <Areachart
        data={chartRows}
        config={benchmarkChart}
        xAxisDataKey={"t"}
        xAxisType="number"
        className="h-full w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={(v) => formatNum(v, 1)}
        tooltipLabelFormatter={tooltipLabelFormatter}
      />
    </Card>
  )
}
