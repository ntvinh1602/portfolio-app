import { formatNum, compactNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { type ReturnChartItem } from "@fund/fund.types"
import ChartCardHeader from "@/components/charts/chartcard-header"

interface Props {
  dateRange: string
  chartData: {
    all: ReturnChartItem[]
    last_1y: ReturnChartItem[]
    last_6m: ReturnChartItem[]
    last_3m: ReturnChartItem[]
  }
  twrYtd: number
  twrAll: number
  cagr: number
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
  dateRange,
  chartData,
  twrYtd,
  twrAll,
  cagr,
}: Props) {
  let chartTimeframe: ReturnChartItem[]

  switch (dateRange) {
    case "3m":
      chartTimeframe = chartData.last_3m
      break
    case "6m":
      chartTimeframe = chartData.last_6m
      break
    case "1y":
      chartTimeframe = chartData.last_1y
      break
    case "all":
      chartTimeframe = chartData.all
      break
    default:
      chartTimeframe = chartData.last_1y
      break
  }

  const xAxisTickFormatter = (value: string) => {
    const date = parseISO(value)
    if (isNaN(date.getTime())) return value // handles cases like "2023" or "2023-Q1"
    switch (dateRange) {
      case "1y":
      case "all":
        return format(date, "MMM yy")
      default:
        return format(date, "dd MMM")
    }
  }

  return (
    <Card>
      <ChartCardHeader
        title="Return"
        descriptionTitle="this year"
        heroStat={`${formatNum(twrYtd * 100, 1)}%`}
        stat1={twrAll}
        formattedStat1={`${formatNum(twrAll * 100, 1)}%`}
        descriptionStat1="all time"
        stat2={cagr}
        formattedStat2={`${formatNum(cagr * 100, 1)}%`}
        descriptionStat2="annualized"
      />
      <CardContent>
        <Areachart
          data={chartTimeframe}
          config={returnChartConfig}
          xAxisDataKey={"snapshot_date"}
          className=" w-full"
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(v) => compactNum(v)}
          tooltipFormatter={(v) => formatNum(v, 1)}
        />
      </CardContent>
    </Card>
  )
}
