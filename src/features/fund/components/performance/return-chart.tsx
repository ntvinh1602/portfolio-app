"use client"

import { useMemo } from "react"
import { formatNum, compactNum, pctNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { returnChart } from "../../config"
import type { ReturnChartCols } from "@fund/fund.types"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"

interface Props {
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartData: ReturnChartCols
}

type ReturnRow = { t: number; portfolio_value: number; vni_value: number }

function colsToRows({ d, p, v }: ReturnChartCols): ReturnRow[] {
  const out: ReturnRow[] = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = { t: d[i] * 86_400_000, portfolio_value: p[i], vni_value: v[i] }
  }
  return out
}

export function ReturnChart({
  year,
  equityReturn,
  vnIndexReturn,
  chartData,
}: Props) {
  const rows = useMemo(() => colsToRows(chartData), [chartData])

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
        data={rows}
        config={returnChart}
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
