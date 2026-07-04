"use client"

import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { netProfitChart } from "@fund/config"

interface Props {
  year?: number
  totalPnl: number
  avgProfit: number
  avgExpense: number
  chartRows: Record<string, string | number | undefined>[]
}

export function NetProfitChart({
  year,
  totalPnl,
  avgProfit,
  avgExpense,
  chartRows,
}: Props) {
  const xAxisFormatter = (value: string) =>
    year === 9999
      ? format(new Date(value), "yyyy")
      : format(new Date(value), "MMM yyyy")

  const description = !year ? "last 1y" : ""

  return (
    <Card>
      <ChartCardHeader
        title="Net Profit"
        heroStat={formatNum(totalPnl)}
        titleLegend={description}
        stat1={avgProfit}
        formattedStat1={compactNum(Math.abs(avgProfit))}
        descriptionStat1="avg. profit"
        stat2={avgExpense}
        formattedStat2={compactNum(Math.abs(avgExpense))}
        descriptionStat2="avg. cost"
      />
      <ChartBarStacked
        data={chartRows}
        config={netProfitChart}
        className="w-full"
        xAxisDataKey={"snapshot_date"}
        xAxisTickFormatter={xAxisFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={(v) => formatNum(v)}
      />
    </Card>
  )
}
