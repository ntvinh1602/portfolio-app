"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import type { ProfitChartPt } from "@fund/fund.types"
import ChartCardHeader from "@/components/charts/chartcard-header"

interface Props {
  year: number
  totalPnL: number
  avgProfit: number
  avgExpense: number
  chartData: ProfitChartPt[]
}

const NetProfitConfig: ChartConfig = {
  tax: { label: "Tax", color: "var(--chart-4)" },
  fee: { label: "Fee", color: "var(--chart-3)" },
  interest: { label: "Interest", color: "var(--chart-2)" },
  revenue: { label: "Revenue", color: "var(--chart-1)" },
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
          config={NetProfitConfig}
          className="h-full w-full"
          xAxisDataKey={"snapshot_date"}
          xAxisTickFormatter={xAxisFormatter}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>
  )
}
