import { formatNum, compactNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { ChartConfig } from "@/components/ui/chart"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { type ReturnChartItem } from "@fund/fund.types"

interface ReturnChartData {
  all: ReturnChartItem[]
  last_1y: ReturnChartItem[]
  last_6m: ReturnChartItem[]
  last_3m: ReturnChartItem[]
}

interface ReturnChartProps {
  dateRange: string
  chartData: ReturnChartData
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
  cagr
}: ReturnChartProps) {
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
      <CardHeader>
        <CardDescription>Return</CardDescription>
        <CardTitle className="text-xl sm:text-2xl flex gap-1 items-baseline">
          {`${formatNum(twrYtd * 100, 1)}%`}
          <span className="text-sm text-muted-foreground">this year</span>
        </CardTitle>
        <CardAction>
          <ItemGroup className="grid grid-cols-2 rounded-2xl bg-muted/50">
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {twrAll < 0 ? (
                    <TrendingDown className="text-destructive size-4" />
                  ) : (
                    <TrendingUp className="text-primary size-4" />
                  )}
                  {`${formatNum(Math.abs(twrAll * 100), 1)}%`}
                </ItemTitle>
                <ItemDescription className="text-xs">all time</ItemDescription>
              </ItemContent>
            </Item>
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {cagr < 0 ? (
                    <TrendingDown className="text-destructive size-4" />
                  ) : (
                    <TrendingUp className="text-primary size-4" />
                  )}
                  {`${formatNum(Math.abs(cagr * 100), 1)}%`}
                </ItemTitle>
                <ItemDescription className="text-xs">
                  annualized
                </ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </CardAction>
      </CardHeader>

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
