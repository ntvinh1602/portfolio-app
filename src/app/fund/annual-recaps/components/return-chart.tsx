import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { Areachart } from "@/components/charts/areachart"
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,  
} from "@/components/ui/card"
import { 
  TrendingUp,
  TrendingDown,
  ChartNoAxesCombined
} from "lucide-react"
import { ChartConfig } from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"

interface ReturnChartPoint {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
  [key: string]: string | number
}

interface ReturnChartProps {
  year: number
  equityReturn: number
  vnIndexReturn: number
  chartData: ReturnChartPoint[]
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
  year,
  equityReturn,
  vnIndexReturn,
  chartData,
}: ReturnChartProps) {
  const xAxisTickFormatter = (value: string) => {
    const date = new Date(value)
    if (isNaN(date.getTime())) return String(value)
    return year === 9999
      ? format(date, "MMM yyyy")
      : format(date, "dd MMM")
  }

  return (
    <Card className="relative flex flex-col gap-4 h-full
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
      <CardHeader>
        <div className="flex gap-5">
          <div className="flex flex-col gap-1">
            <CardDescription>Equity Return</CardDescription>
            <CardTitle className="flex items-center text-xl font-light gap-1">
              {equityReturn < 0
                ? <TrendingDown className="text-red-700 h-6 w-6" />
                : <TrendingUp className="text-green-500 h-6 w-6" />
              }
              <span className="tabular-nums">
                {formatNum(Math.abs(equityReturn), 1)}%
              </span>
            </CardTitle>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-12 -mr-1"
          />
          <div className="flex flex-col gap-1">
            <CardDescription>VN-Index</CardDescription>
            <CardTitle className="flex items-center text-xl font-light gap-1">
              {vnIndexReturn < 0
                ? <TrendingDown className="text-red-700 h-6 w-6" />
                : <TrendingUp className="text-green-500 h-6 w-6" />
              }
              <span className="tabular-nums">
                {formatNum(Math.abs(vnIndexReturn), 1)}%
              </span>
            </CardTitle>
          </div>
        </div>
        <CardAction>
          <ChartNoAxesCombined className="stroke-1"/>
        </CardAction>
      </CardHeader>

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