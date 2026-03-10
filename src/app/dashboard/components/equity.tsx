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

interface EquityChartPoint {
  snapshot_date: string
  net_equity: number
  cumulative_cashflow: number
  [key: string]: string | number
}

interface EquityChartProps {
  dateRange: string
  onDateRangeChange: (range: string) => void
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
  onDateRangeChange,
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
        <CardDescription>Equity</CardDescription>
        <div className="flex gap-2 items-baseline">
          <CardTitle className="text-2xl font-light">
            {formatNum(totalEquity)}
          </CardTitle>
        </div>
        <CardAction className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {pnlMtd < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {compactNum(Math.abs(pnlMtd))}
            </div>
            <CardDescription className="text-xs">this month</CardDescription>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-8 -mr-1"
          />
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {pnlYtd < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {compactNum(Math.abs(pnlYtd))}
            </div>
            <CardDescription className="text-xs">this year</CardDescription>
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
          config={equityChartConfig}
          xAxisDataKey={"snapshot_date"}
          className="h-full w-full"
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(v) => compactNum(v)}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>
  )
}