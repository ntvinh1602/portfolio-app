"use client"

import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { ProfitChartPt } from "@fund/fund.types"
import { netProfitChart } from "@fund/config"

interface ProfitChartPoint extends ProfitChartPt {
  [key: string]: string | number
}

interface Props {
  totalPnL: number
  avgProfit: number
  avgExpense: number
  chartData: ProfitChartPoint[]
}

export function NetProfit({
  totalPnL,
  avgProfit,
  avgExpense,
  chartData,
}: Props) {
  return (
    <Card>
      <ChartCardHeader
        title="Net Profit"
        heroStat={formatNum(totalPnL)}
        descriptionTitle="last 1y"
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
          className="w-full"
          xAxisDataKey={"snapshot_date"}
          xAxisTickFormatter={(v) => format(new Date(v), "MMM yy")}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>
  )
}
