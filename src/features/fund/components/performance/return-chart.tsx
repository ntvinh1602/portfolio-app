"use client"

import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card, CardContent } from "@/components/ui/card"
import type { ReturnChartPt } from "@fund/fund.types"
import { ChartCardHeader } from "@/components/charts/chartcard-header"
import { returnChart } from "../../config"

interface Props {
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartData: ReturnChartPt[]
}

export function ReturnChart({
  year,
  equityReturn,
  vnIndexReturn,
  chartData,
}: Props) {
  const xAxisTickFormatter = (value: string) => {
    const date = new Date(value)
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
      <Areachart
        data={chartData}
        config={returnChart}
        xAxisDataKey={"snapshot_date"}
        className="h-full w-full"
        xAxisTickFormatter={xAxisTickFormatter}
        yAxisTickFormatter={(v) => compactNum(v)}
        tooltipFormatter={(v) => formatNum(v, 1)}
      />
    </Card>
  )
}
