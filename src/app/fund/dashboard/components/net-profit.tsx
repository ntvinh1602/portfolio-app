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
import { ChartBarStacked } from "@/components/charts/stacked-barchart"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle
} from "@/components/ui/item"

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
    <Card>
      <CardHeader>
        <CardDescription>Net Profit</CardDescription>
        <CardTitle className="text-xl sm:text-2xl flex gap-1 items-baseline">
          {formatNum(totalPnL)}
          <span className="text-sm text-muted-foreground">last 1y</span>
        </CardTitle>
        <CardAction>
          <ItemGroup className="grid grid-cols-2 rounded-2xl bg-muted/50">
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {avgProfit < 0
                    ? <TrendingDown className="text-red-700 size-3" />
                    : <TrendingUp className="text-green-500 size-3" />
                  }{compactNum(Math.abs(avgProfit))}
                </ItemTitle>
                <ItemDescription className="text-xs">avg. profit</ItemDescription>
              </ItemContent>
            </Item>
            <Item size="xs">
              <ItemContent className="items-end">
                <ItemTitle>
                  {avgExpense < 0
                    ? <TrendingDown className="text-red-700 size-3" />
                    : <TrendingUp className="text-green-500 size-3" />
                  }{compactNum(Math.abs(avgExpense))}
                </ItemTitle>
                <ItemDescription className="text-xs">avg. cost</ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ChartBarStacked
          data={chartData}
          config={NetProfitConfig}
          className="w-full"
          xAxisDataKey={"snapshot_date"}
          xAxisTickFormatter={(v) => format(new Date(v), "MMM yy")}
          tooltipFormatter={(v) => formatNum(v)}
        />
      </CardContent>
    </Card>    
  )
}