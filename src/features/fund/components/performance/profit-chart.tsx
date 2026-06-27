"use client"

import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import type { ProfitChartPt } from "@fund/fund.types"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { netProfitChart } from "@fund/config"

interface Props {
  year: number
  totalPnL: number
  avgProfit: number
  avgExpense: number
  chartData: ProfitChartPt[]
}

export function ProfitChart({
  year,
  totalPnL,
  avgProfit,
  avgExpense,
  chartData,
}: Props) {
  const xAxisFormatter = (value: string) => {
    const date = new Date(value)
    if (isNaN(date.getTime())) return String(value)
    return year === 9999 ? format(date, "yyyy") : format(date, "MMM")
  }

  return (
    <Card>
      <ChartCardHeader
        title="Net Profit"
        heroStat={formatNum(totalPnL)}
        stat1={avgProfit}
        formattedStat1={compactNum(Math.abs(avgProfit))}
        descriptionStat1="avg. profit"
        stat2={avgExpense}
        formattedStat2={compactNum(Math.abs(avgExpense))}
        descriptionStat2="avg. cost"
      />
      <CardContent>
        <ChartBarStacked
          data={chartData}
          config={netProfitChart}
          className="h-full w-full"
          xAxisDataKey={"snapshot_date"}
          xAxisTickFormatter={xAxisFormatter}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>
  )
}
