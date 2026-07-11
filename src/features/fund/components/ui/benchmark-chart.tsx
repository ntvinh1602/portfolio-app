"use client"

import { formatNum, compactNum, pctNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"
import { ChartMeta } from "@fund/fund.types"

interface Props {
  meta: ChartMeta
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartRows: Record<string, string | number>[]
}

export function BenchmarkChart({
  meta,
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
        title={meta.name}
        heroStat={pctNum(equityReturn - vnIndexReturn)}
        stat1={equityReturn}
        formattedStat1={pctNum(Math.abs(equityReturn))}
        descriptionStat1={meta.stat1 || ""}
        stat2={vnIndexReturn}
        formattedStat2={pctNum(Math.abs(vnIndexReturn))}
        descriptionStat2={meta.stat2 || ""}
      />
      <Areachart
        data={chartRows}
        config={{
          portfolio_value: { label: "Equity", color: "var(--chart-1)" },
          vni_value: { label: "VN-Index", color: "var(--chart-2)" },
        }}
        xAxisDataKey={"t"}
        xAxisType="number"
        className="h-full w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={(v: number) => formatNum(v, 2)}
        tooltipLabelFormatter={tooltipLabelFormatter}
      />
    </Card>
  )
}
