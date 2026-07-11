"use client"

import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"

interface Props {
  dateRange: string
  chartTimeframe: Record<string, string | number>[]
  totalEquity: number
  pnlMtd: number
  pnlYtd: number
}

export function EquityChart({
  dateRange,
  chartTimeframe,
  totalEquity,
  pnlMtd,
  pnlYtd,
}: Props) {
  const xAxisTickFormatter = (ms: number) =>
    ["last_1y", "all"].includes(dateRange)
      ? format(new Date(ms), "MMM yyyy")
      : format(new Date(ms), "dd MMM")

  const tooltipFormatter = (v: number) => formatNum(v)

  const tooltipLabelFormatter: TooltipLabelFormatter = (_label, payload) => {
    const ms = payload?.[0]?.payload?.t as number | undefined
    if (ms == null) return ""
    return format(new Date(ms), "yyyy-MM-dd")
  }
  return (
    <Card>
      <ChartCardHeader
        title="Equity"
        heroStat={formatNum(totalEquity)}
        stat1={pnlMtd}
        formattedStat1={compactNum(Math.abs(pnlMtd))}
        descriptionStat1="this month"
        stat2={pnlYtd}
        formattedStat2={compactNum(Math.abs(pnlYtd))}
        descriptionStat2="this year"
      />
      <Areachart
        data={chartTimeframe}
        config={{
          net_equity: { label: "Equity", color: "var(--chart-1)" },
          cumulative_cashflow: { label: "Deposit", color: "var(--chart-2)" },
        }}
        xAxisDataKey={"t"}
        xAxisType="number"
        className="w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={tooltipFormatter}
        tooltipLabelFormatter={tooltipLabelFormatter}
      />
    </Card>
  )
}
