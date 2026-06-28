"use client"

import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import type { NetProfitCard, ProfitChartPt } from "@fund/fund.types"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { netProfitChart } from "@fund/config"

interface Props {
  year?: number
  data: NetProfitCard
}

export function NetProfitChart({ year, data }: Props) {
  const xAxisFormatter = (value: string) => {
    const date = new Date(value)
    return year === 9999 ? format(date, "yyyy") : format(date, "MMM yyyy")
  }
  const description = !year ? "last 1y" : ""

  return (
    <Card>
      <ChartCardHeader
        title="Net Profit"
        heroStat={formatNum(data.total_pnl)}
        titleLegend={description}
        stat1={data.avg_profit}
        formattedStat1={compactNum(Math.abs(data.avg_profit))}
        descriptionStat1="avg. profit"
        stat2={data.avg_expense}
        formattedStat2={compactNum(Math.abs(data.avg_expense))}
        descriptionStat2="avg. cost"
      />
      <ChartBarStacked
        data={data.profit_chart}
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
