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
import { useState, useEffect } from "react"
import { ChartConfig } from "@/components/ui/chart"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle
} from "@/components/ui/item"

interface ReturnChartPoint {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
  [key: string]: string | number
}

interface ReturnChartProps {
  dateRange: string
  chartData: ReturnChartPoint[]
  twrYtd: number
  twrAll: number
  inceptionDate: string
}

const returnChartConfig: ChartConfig = {
  portfolio_value: {
    label: "Equity",
    color: "var(--chart-1)"
  },
  vni_value: {
    label: "VN-Index",
    color: "var(--chart-2)"
  }
}

export function ReturnChart({
  dateRange,
  chartData,
  twrYtd,
  twrAll,
  inceptionDate
}: ReturnChartProps) {

  // Compute CAGR from a ticking "now" that refreshes every minute.
  // Use state + effect (not Date.now() during render) to keep the server
  // and client renders deterministic — cacheComponents requires this.
  const start = new Date(inceptionDate).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const years = now !== null
    ? (now - start) / (1000 * 60 * 60 * 24 * 365.25)
    : 0

  const cagr = years > 0
    ? (Math.pow(1 + twrAll, 1 / years) - 1) * 100
    : 0

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
                  {twrAll < 0
                    ? <TrendingDown className="text-red-700 size-3" />
                    : <TrendingUp className="text-green-500 size-3" />
                  }{`${formatNum(Math.abs(twrAll * 100), 1)}%`}
                </ItemTitle>
                <ItemDescription className="text-xs">all time</ItemDescription>
              </ItemContent>
            </Item>
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {cagr < 0
                    ? <TrendingDown className="text-red-700 size-3" />
                    : <TrendingUp className="text-green-500 size-3" />
                  }{`${formatNum(Math.abs(cagr), 1)}%`}
                </ItemTitle>
                <ItemDescription className="text-xs">annualized</ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </CardAction>
      </CardHeader>

      <CardContent>
        <Areachart
          data={chartData}
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
