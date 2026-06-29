"use client"

import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { equityChart } from "@fund/config"
import { useMemo } from "react"
import type {
  EquityChartCols,
  EquityChartWindows,
  EquityReturnView,
} from "@fund/fund.types"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"

interface Props {
  dateRange: string
  chartData: EquityChartWindows // columnar now
  data: EquityReturnView
}

// epoch-days -> the old row shape; UTC slice reproduces exact YYYY-MM-DD
function colsToRows({ d, e, c }: EquityChartCols) {
  const out = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = {
      t: d[i] * 86_400_000,
      net_equity: e[i],
      cumulative_cashflow: c[i],
    }
  }
  return out
}

export function EquityChart({ dateRange, chartData, data }: Props) {
  const cols =
    chartData[dateRange as keyof typeof chartData] ?? chartData.last_1y

  const chartTimeframe = useMemo(() => colsToRows(cols), [cols])

  const xAxisTickFormatter = (ms: number) =>
    ["last_1y", "all"].includes(dateRange)
      ? format(new Date(ms), "MMM yyyy")
      : format(new Date(ms), "dd MMM")

  // VALUE formatter — one arg, formats the equity/return number
  const tooltipFormatter = (v: number) => formatNum(v) // ReturnChart: formatNum(v, 1)

  // LABEL formatter — typed to match the prop, reads epoch from the row
  const tooltipLabelFormatter: TooltipLabelFormatter = (_label, payload) => {
    const ms = payload?.[0]?.payload?.t as number | undefined
    if (ms == null) return ""
    return format(new Date(ms), "yyyy-MM-dd")
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
        xAxisDataKey={"t"}
        xAxisType="number"
        className="w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={tooltipFormatter} // value → (value: number) => string
        tooltipLabelFormatter={tooltipLabelFormatter} // label → TooltipLabelFormatter
      />
    </Card>
  )
}
