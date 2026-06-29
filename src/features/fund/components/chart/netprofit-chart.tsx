"use client"

import { Card } from "@/components/ui/card"
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import type { Last1YProfitView } from "@fund/fund.types"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { netProfitChart } from "@fund/config"
import type { ProfitChartCols } from "@fund/fund.types"

interface Props {
  year?: number
  data: Last1YProfitView
}

// Columnar → row-oriented for Recharts. Index i lines up across every column.
function columnsToRows(cols: ProfitChartCols) {
  return cols.snapshot_date.map((snapshot_date, i) => ({
    snapshot_date,
    revenue: cols.revenue[i],
    fee: cols.fee[i],
    interest: cols.interest[i],
    tax: cols.tax[i],
  }))
}

export function NetProfitChart({ year, data }: Props) {
  const xAxisFormatter = (value: string) =>
    year === 9999
      ? format(new Date(value), "yyyy")
      : format(new Date(value), "MMM yyyy")

  const description = !year ? "last 1y" : ""
  const chartData = columnsToRows(data.profit_chart)
  
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
        data={chartData}
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
