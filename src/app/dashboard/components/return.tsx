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
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartConfig } from "@/components/ui/chart"
import { useState, useEffect } from "react"

interface ReturnChartPoint {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
  [key: string]: string | number
}

interface ReturnChartProps {
  dateRange: string
  onDateRangeChange: (range: string) => void
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
  onDateRangeChange,
  chartData,
  twrYtd,
  twrAll,
  inceptionDate
}: ReturnChartProps) {

  const start = new Date(inceptionDate).getTime()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60_000)

    return () => clearInterval(interval)
  }, [])
  const years = (now - start) / (1000 * 60 * 60 * 24 * 365.25)

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
    <Card className="flex flex-col gap-0 flex-1
      backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] 
      before:content-[''] 
      before:absolute 
      before:top-0 
      before:left-0 
      before:w-full 
      before:h-px 
      before:bg-gradient-to-r 
      before:from-transparent 
      before:via-ring/40 
      before:to-transparent"
    >
      <CardHeader className="flex-col gap-1 items-center">
        <CardDescription>Return</CardDescription>
        <div className="flex gap-2 items-baseline">
          <CardTitle className="text-2xl font-light">
            {`${formatNum(twrYtd * 100, 1)}%`}
          </CardTitle>
          <CardDescription className="text-xs">this year</CardDescription>
        </div>
        <CardAction className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {twrAll < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {`${formatNum(Math.abs(twrAll * 100), 1)}%`}
            </div>
            <CardDescription className="text-xs">all time</CardDescription>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-8 -mr-1"
          />
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {cagr < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {`${formatNum(Math.abs(cagr), 1)}%`}
            </div>
            <CardDescription className="text-xs">annualized</CardDescription>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 h-full">
        <ToggleGroup
          type="single"
          onValueChange={onDateRangeChange}
          defaultValue="1y"
          variant="default"
          spacing={1}
          size="sm"
          className="self-end [&_[data-state=on]]:bg-primary/10"
        >
          <ToggleGroupItem value="3m">3M</ToggleGroupItem>
          <ToggleGroupItem value="6m">6M</ToggleGroupItem>
          <ToggleGroupItem value="1y">1Y</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
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