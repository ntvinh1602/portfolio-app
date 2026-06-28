"use client"

import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import type { ProfitChartPt } from "@fund/fund.types"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { netProfitChart } from "@fund/config"
import ChartCardSkeleton from "@/components/skeletons/chart-card"

interface Props {
  year?: number
  totalPnL: number
  avgProfit: number
  avgExpense: number
  chartData: ProfitChartPt[]
}

export function NetProfitChart({
  year,
  totalPnL,
  avgProfit,
  avgExpense,
  chartData,
}: Props) {
  const xAxisFormatter = (value: string) => {
    const date = new Date(value)
    return year === 9999 ? format(date, "yyyy") : format(date, "MMM yyyy")
  }
  const description = !year ? "last 1y" : ""

  return (
    <Card>
      <ChartCardHeader
        title="Net Profit"
        heroStat={formatNum(totalPnL)}
        titleLegend={description}
        stat1={avgProfit}
        formattedStat1={compactNum(Math.abs(avgProfit))}
        descriptionStat1="avg. profit"
        stat2={avgExpense}
        formattedStat2={compactNum(Math.abs(avgExpense))}
        descriptionStat2="avg. cost"
      />
      <ChartBarStacked
        data={chartData}
        config={netProfitChart}
        className="w-full"
        xAxisDataKey={"snapshot_date"}
        xAxisTickFormatter={xAxisFormatter}
        tooltipFormatter={(v) => formatNum(v)}
      />
    </Card>
  )
}
