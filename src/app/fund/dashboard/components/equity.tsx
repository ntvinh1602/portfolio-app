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
import {  } from "@/components/ui/chart"
import { ChartConfig } from "@/components/ui/chart"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle
} from "@/components/ui/item"

interface EquityChartPoint {
  snapshot_date: string
  net_equity: number
  cumulative_cashflow: number
  [key: string]: string | number
}

interface EquityChartProps {
  dateRange: string
  chartData: EquityChartPoint[]
  totalEquity: number
  pnlMtd: number
  pnlYtd: number
}

const equityChartConfig: ChartConfig = {
  net_equity: {
    label: "Equity",
    color: "var(--chart-1)"
  },
  cumulative_cashflow: {
    label: "Paid-in Capital",
    color: "var(--chart-2)"
  }
}

export function EquityChart({
  dateRange,
  chartData,
  totalEquity,
  pnlMtd,
  pnlYtd
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

  return (
    <Card>
      <CardHeader>
        <CardDescription>Equity</CardDescription>
        <CardTitle className="text-xl sm:text-2xl">
          {formatNum(totalEquity)}
        </CardTitle>
        <CardAction>
          <ItemGroup className="grid grid-cols-2 rounded-2xl bg-muted/50">
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {pnlMtd < 0
                    ? <TrendingDown className="text-red-700 size-3" />
                    : <TrendingUp className="text-green-500 size-3" />
                  }{compactNum(Math.abs(pnlMtd))}
                </ItemTitle>
                <ItemDescription className="text-xs">this month</ItemDescription>
              </ItemContent>
            </Item>
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {pnlMtd < 0
                    ? <TrendingDown className="text-red-700 size-3" />
                    : <TrendingUp className="text-green-500 size-3" />
                  }{compactNum(Math.abs(pnlYtd))}</ItemTitle>
                <ItemDescription className="text-xs">this year</ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Areachart
          data={chartData}
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