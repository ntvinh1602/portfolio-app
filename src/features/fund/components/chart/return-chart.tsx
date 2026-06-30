"use client"

import { formatNum, compactNum, pctNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card } from "@/components/ui/card"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { returnChart } from "@fund/config"
import { useMemo } from "react"
import type {
  ReturnChartCols,
  ReturnChartWindows,
  EquityReturnView,
} from "@fund/fund.types"
import type { TooltipLabelFormatter } from "@/components/charts/areachart"

interface Props {
  dateRange: string
  chartData: ReturnChartWindows // columnar now
  data: EquityReturnView
}

function colsToRows({ d, p, v }: ReturnChartCols) {
  const out = new Array(d.length)
  for (let i = 0; i < d.length; i++) {
    out[i] = { t: d[i] * 86_400_000, portfolio_value: p[i], vni_value: v[i] }
  }
  return out
}

export function ReturnChart({ dateRange, chartData, data }: Props) {
  const cols =
    chartData[dateRange as keyof typeof chartData] ?? chartData.last_1y

  const chartTimeframe = useMemo(() => colsToRows(cols), [cols])

  const xAxisTickFormatter = (ms: number) =>
    ["last_1y", "all"].includes(dateRange)
      ? format(new Date(ms), "MMM yyyy")
      : format(new Date(ms), "dd MMM")

  // VALUE formatter — one arg, formats the equity/return number
  const tooltipFormatter = (v: number) => formatNum(v, 2)

  // LABEL formatter — typed to match the prop, reads epoch from the row
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
        heroStat={pctNum(data.twr_ytd)}
        stat1={data.twr_all}
        formattedStat1={pctNum(data.twr_all)}
        descriptionStat1="all time"
        stat2={data.cagr}
        formattedStat2={pctNum(data.cagr)}
        descriptionStat2="annualized"
      />
      <Areachart
        data={chartTimeframe}
        config={returnChart}
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
