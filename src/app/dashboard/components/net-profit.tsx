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
import { format } from "date-fns"
import { formatNum, compactNum } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { ChartBarStacked } from "@/components/charts/stacked-barchart"

interface ProfitChartPoint {
  snapshot_date: string
  tax: number
  fee: number
  interest: number
  revenue: number
  [key: string]: string | number
}

interface NetProfitProps {
  totalPnL: number
  avgProfit: number
  avgExpense: number
  chartData: ProfitChartPoint[]
}

const NetProfitConfig: ChartConfig = {
  tax: { label: "Tax", color: "var(--chart-4)" },
  fee: { label: "Fee", color: "var(--chart-3)" },
  interest: { label: "Interest", color: "var(--chart-2)" },
  revenue: { label: "Revenue", color: "var(--chart-1)" }  
}

export function NetProfit({
  totalPnL,
  avgProfit,
  avgExpense,
  chartData
}: NetProfitProps) {
  return (
    <Card className="relative flex flex-col gap-0 flex-1
      backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent"
    >
      <CardHeader className="flex-col gap-1 items-center">
        <CardDescription>Net Profit</CardDescription>
        <div className="flex gap-2 items-baseline">
          <CardTitle className="text-2xl font-light">
            {formatNum(totalPnL)}
          </CardTitle>
          <CardDescription className="text-xs">last 1y</CardDescription>
        </div>
        <CardAction className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {avgProfit < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {compactNum(Math.abs(avgProfit))}
            </div>
            <CardDescription className="text-xs">avg. profit</CardDescription>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-8 -mr-1"
          />
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {avgExpense < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {compactNum(Math.abs(avgExpense))}
            </div>
            <CardDescription className="text-xs">avg. cost</CardDescription>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 h-full">
        <ChartBarStacked
          data={chartData}
          config={NetProfitConfig}
          className="h-full w-full"
          xAxisDataKey={"snapshot_date"}
          xAxisTickFormatter={(v) => format(new Date(v), "MMM yy")}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>    
  )
}