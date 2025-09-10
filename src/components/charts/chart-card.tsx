"use client"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { ChartConfig } from "@/components/ui/chart"
import { parseISO, format } from "date-fns"
import { TabSwitcher } from "@/components/tab-switcher"
import { Separator } from "../ui/separator"

interface ChartCardProps<
  TData extends { snapshot_date: string; [key: string]: number | string }
> {
  cardClassName?: string
  description: string
  majorValue: number | null
  majorValueFormatter: (value: number) => string
  minorValue1: number | null
  minorValue1Formatter: (value: number) => string
  minorText1: string
  minorValue2: number | null
  minorValue2Formatter: (value: number) => string
  minorText2: string
  chartComponent: React.ElementType
  chartData: TData[]
  chartConfig: ChartConfig
  chartClassName?: string
  xAxisDataKey: string
  lineDataKeys: string[]
  legend?: boolean
  xAxisTickFormatter?: (value: string | number) => string
  yAxisTickFormatter?: (value: string | number) => string
  tooltipValueFormatter?: (value: number) => string
  children?: React.ReactNode
  dateRange: string
  onDateRangeChange: (value: string) => void
}

function ChartCard<
  TData extends { snapshot_date: string; [key: string]: number | string }
>({
  description,
  majorValue,
  majorValueFormatter,
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
  xAxisDataKey,
  lineDataKeys,
  legend,
  yAxisTickFormatter,
  tooltipValueFormatter,
  dateRange,
  onDateRangeChange,
}: ChartCardProps<TData>) {

  const xAxisTickFormatter = (value: string | number) => {
    if (typeof value !== "string") {
      return value.toString()
    }
    const date = parseISO(value)
    if (isNaN(date.getTime())) {
      return value
    }
    switch (dateRange) {
      case "1y":
      case "all_time":
        return format(date, "MMM yy")
      default:
        return format(date, "dd MMM")
    }
  }

  return (
    <Card className="flex flex-col gap-0 h-full">
      <CardHeader className="px-4 items-center">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl">
          {majorValue && majorValueFormatter(majorValue)}
        </CardTitle>
        <CardAction className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {minorValue1 !== null && minorValue1 < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {minorValue1 !== null && minorValue1Formatter(Math.abs(minorValue1))}
            </div>
            <CardDescription className="text-xs">{minorText1}</CardDescription>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-8 -mr-1"
          />
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {minorValue2 !== null && minorValue2 < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {minorValue2 !== null && minorValue2Formatter(Math.abs(minorValue2))}
            </div>
            <CardDescription className="text-xs">{minorText2}</CardDescription>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 flex flex-col gap-1 h-full">
        <TabSwitcher
          value={dateRange}
          onValueChange={onDateRangeChange}
          options={[
            { label: "3M", value: "3m" },
            { label: "6M", value: "6m" },
            { label: "1Y", value: "1y" },
            { label: "All", value: "all_time" }
          ]}
          border={false}
          tabClassName="ml-auto"
          triggerClassName="w-[50px]"
        />
        <ChartComponent
          data={chartData}
          chartConfig={chartConfig}
          className={chartClassName}
          xAxisDataKey={xAxisDataKey}
          lineDataKeys={lineDataKeys}
          legend={legend}
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={yAxisTickFormatter}
          valueFormatter={tooltipValueFormatter}
        />
      </CardContent>
    </Card>
  )
}

function ChartCardSkeleton({ cardClassName, chartHeight }: { cardClassName?: string, chartHeight: string }) {
  return (
    <Card className={`gap-4 h-full ${cardClassName}`}>
      <CardHeader className="px-4">
        <CardDescription className="flex items-center w-fit">
          <Skeleton className="h-4 w-24" />
        </CardDescription>
        <CardTitle className="text-2xl">
          <Skeleton className="h-8 w-32" />
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <Skeleton className="h-4 w-16" />
          <CardDescription className="text-xs">
            <Skeleton className="h-3 w-20" />
          </CardDescription>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-4">
        <Skeleton className={`w-full ${chartHeight}`} />
      </CardFooter>
    </Card>
  )
}

export {
  ChartCard,
  ChartCardSkeleton
}