import { formatNum, compactNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { type EquityChartItem } from "@fund/fund.types"
import ChartCardHeader from "@/components/charts/chartcard-header"

interface EquityChartProps {
  dateRange: string
  chartData: {
    all: EquityChartItem[]
    last_1y: EquityChartItem[]
    last_6m: EquityChartItem[]
    last_3m: EquityChartItem[]
  }
  totalEquity: number
  pnlMtd: number
  pnlYtd: number
}

const equityChartConfig: ChartConfig = {
  net_equity: {
    label: "Equity",
    color: "var(--chart-1)",
  },
  cumulative_cashflow: {
    label: "Paid-in Capital",
    color: "var(--chart-2)",
  },
}

export function EquityChart({
  dateRange,
  chartData,
  totalEquity,
  pnlMtd,
  pnlYtd,
}: EquityChartProps) {
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

  let chartTimeframe: EquityChartItem[]

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

  return (
    <Card>
      <ChartCardHeader
        title="Equity"
        heroStat={formatNum(totalEquity)}
        stat1={pnlMtd}
        formattedStat1={compactNum(Math.abs(pnlMtd))}
        descriptionStat1="this month"
        stat2={pnlYtd}
        formattedStat2={compactNum(Math.abs(pnlYtd))}
        descriptionStat2="this year"
      />

      <CardContent>
        <Areachart
          data={chartTimeframe}
          config={equityChartConfig}
          xAxisDataKey={"snapshot_date"}
          className="w-full"
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(v) => compactNum(v)}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>
  )
}
