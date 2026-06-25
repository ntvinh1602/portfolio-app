"use client"

import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import type { ReturnChartItem } from "@fund/fund.types"
import ChartCardHeader from "@/components/charts/chartcard-header"

interface ReturnChartProps {
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartData: ReturnChartItem[]
}

const returnChartConfig: ChartConfig = {
  portfolio_value: {
    label: "Equity",
    color: "var(--chart-1)",
  },
  vni_value: {
    label: "VN-Index",
    color: "var(--chart-2)",
  },
}

export function ReturnChart({
  year,
  equityReturn,
  vnIndexReturn,
  chartData,
}: ReturnChartProps) {
  const xAxisTickFormatter = (value: string) => {
    const date = new Date(value)
    if (isNaN(date.getTime())) return String(value)
    return year === 9999 ? format(date, "MMM yyyy") : format(date, "dd MMM")
  }

  return (
    <Card>
      <ChartCardHeader
        title="Alpha"
        heroStat={`${formatNum(equityReturn - vnIndexReturn, 1)}%`}
        stat1={equityReturn}
        formattedStat1={`${formatNum(Math.abs(equityReturn), 1)}%`}
        descriptionStat1="equity return"
        stat2={vnIndexReturn}
        formattedStat2={`${formatNum(Math.abs(vnIndexReturn), 1)}%`}
        descriptionStat2="VNI return"
      />
      <CardContent className="flex flex-col gap-4 h-full">
        <Areachart
          data={chartData}
          config={returnChartConfig}
          xAxisDataKey={"snapshot_date"}
          className="h-full w-full"
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(v) => compactNum(v)}
          tooltipFormatter={(v) => formatNum(v, 1)}
        />
      </CardContent>
    </Card>
  )
}
