"use client"

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
import { parseISO, format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface ChartCardProps<
  TData extends { snapshot_date: string; [key: string]: number | string }
> {
  cardClassName?: string
  title: string
  majorValue: number | null
  majorValueFormatter: (value: number) => string
  description?: string
  minorValue1?: number | null
  minorValue1Formatter?: (value: number) => string
  minorText1?: string
  minorValue2?: number | null
  minorValue2Formatter?: (value: number) => string
  minorText2?: string
  chartComponent: React.ElementType
  chartData: TData[]
  chartConfig: ChartConfig
  chartClassName?: string
  chartDataKeys: string[]
  legend?: boolean
  xAxisTickFormatter?: (value: string | number) => string // ✅ user-supplied formatter
  yAxisTickFormatter?: (value: string | number) => string
  tooltipValueFormatter?: (value: number) => string
  children?: React.ReactNode
  dateRange?: string
  onDateRangeChange?: (value: string) => void
}

export function ChartCard<
  TData extends { snapshot_date: string; [key: string]: number | string }
>({
  title,
  majorValue,
  majorValueFormatter,
  description,
  minorValue1,
  minorValue1Formatter,
  minorText1,
  minorValue2,
  minorValue2Formatter,
  minorText2,
  chartComponent: ChartComponent,
  chartData,
  chartConfig,
  chartClassName,
  chartDataKeys,
  legend,
  xAxisTickFormatter,
  yAxisTickFormatter,
  tooltipValueFormatter,
  dateRange,
  onDateRangeChange,
}: ChartCardProps<TData>) {

  // ✅ default formatter (used only if no custom formatter is passed)
  const defaultXAxisTickFormatter = (value: string | number) => {
    if (typeof value !== "string") return value.toString()
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
    <Card 
      variant="glow"
      className="relative flex flex-col gap-0 h-full"
    >
      <CardHeader className="items-center">
        <CardDescription>{title}</CardDescription>
        <div className="flex gap-2 items-baseline">
          <CardTitle className="text-2xl">
            {majorValue && majorValueFormatter(majorValue)}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <CardAction className="flex items-center gap-4">
          {minorValue1 && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
                {minorValue1 !== null && minorValue1 < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                {minorValue1 !== null &&
                  minorValue1Formatter?.(Math.abs(minorValue1))}
              </div>
              <CardDescription className="text-xs">{minorText1}</CardDescription>
            </div>
          )}
          {minorValue2 && (
            <Separator
              orientation="vertical"
              className="data-[orientation=vertical]:h-8 -mr-1"
            />
          )}
          {minorValue2 && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
                {minorValue2 !== null && minorValue2 < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                {minorValue2 !== null &&
                  minorValue2Formatter?.(Math.abs(minorValue2))}
              </div>
              <CardDescription className="text-xs">{minorText2}</CardDescription>
            </div>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 h-full">
        {dateRange && onDateRangeChange && (
          <ToggleGroup
            type="single"
            onValueChange={onDateRangeChange}
            defaultValue="1y"
            variant="outline"
            className="self-end"
          >
            <ToggleGroupItem value="3m">3M</ToggleGroupItem>
            <ToggleGroupItem value="6m">6M</ToggleGroupItem>
            <ToggleGroupItem value="1y">1Y</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        )}
        <ChartComponent
          data={chartData}
          config={chartConfig}
          className={chartClassName}
          xAxisDataKey={"snapshot_date"}
          dataKeys={chartDataKeys}
          legend={legend}
          xAxisTickFormatter={xAxisTickFormatter ?? defaultXAxisTickFormatter}
          yAxisTickFormatter={yAxisTickFormatter}
          valueFormatter={tooltipValueFormatter}
        />
      </CardContent>
    </Card>
  )
}
