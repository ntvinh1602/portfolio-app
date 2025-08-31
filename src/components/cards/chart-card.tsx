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
import { useRouter } from "next/navigation"
import { ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { ChartConfig } from "@/components/ui/chart"
import React from "react"
import { useChartTicks } from "@/hooks/use-chart-ticks"
import TabSwitcher from "@/components/tab-switcher"

interface ChartCardProps<
  TData extends { snapshot_date: string; [key: string]: number | string }
> {
  cardClassName?: string
  description: string
  descriptionLink: string
  titleValue: number | null | undefined
  titleValueFormatter: (value: number) => string
  changeValue: number | null
  changeValueFormatter: (value: number) => string
  changePeriod: string
  chartComponent: React.ElementType
  chartData: TData[]
  chartConfig: ChartConfig
  chartClassName?: string
  xAxisDataKey: string
  lineDataKeys: string[]
  grid?: boolean
  legend?: boolean
  yAxisTickFormatter?: (value: string | number) => string
  children?: React.ReactNode
  dateRange: string
  onDateRangeChange: (value: string) => void
}

function ChartCard<
  TData extends { snapshot_date: string; [key: string]: number | string }
>({
  description,
  descriptionLink,
  titleValue,
  titleValueFormatter,
  changeValue,
  changeValueFormatter,
  changePeriod,
  chartComponent: ChartComponent,
  chartData,
  chartConfig,
  chartClassName,
  xAxisDataKey,
  lineDataKeys,
  grid,
  legend,
  yAxisTickFormatter,
  dateRange,
  onDateRangeChange,
}: ChartCardProps<TData>) {
  const router = useRouter()
  const { ticks, xAxisTickFormatter } = useChartTicks(chartData, dateRange)
  const handleNavigation = () => {
    router.push(descriptionLink)
  }

  return (
    <Card className="flex flex-col gap-0 h-full">
      <CardHeader className="px-4">
        <CardDescription
          className="flex items-center w-fit"
          onClick={handleNavigation}
        >
          {description}<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl">
          {titleValue && titleValueFormatter(titleValue)}
        </CardTitle>
        <CardAction className="flex flex-col items-end self-center">
          <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
            {changeValue !== null && changeValue < 0
              ? <TrendingDown className="text-red-700 dark:text-red-400" />
              : <TrendingUp className="text-green-700 dark:text-green-400" />
            }
            {changeValue !== null && changeValueFormatter(Math.abs(changeValue))}
          </div>
          <CardDescription className="text-xs">{changePeriod}</CardDescription>
        </CardAction>
      </CardHeader>
      <CardContent className="px-4 flex flex-col gap-1 h-full">
        <TabSwitcher
          value={dateRange}
          onValueChange={onDateRangeChange}
          options={[
            { label: "3 month", value: "3m" },
            { label: "6 month", value: "6m" },
            { label: "1 year", value: "1y" },
            { label: "All time", value: "all_time" },
          ]}
          border={false}
          className="w-full md:w-3/4 ml-auto"
        />
        <ChartComponent
          data={chartData}
          chartConfig={chartConfig}
          className={chartClassName}
          xAxisDataKey={xAxisDataKey}
          lineDataKeys={lineDataKeys}
          grid={grid}
          legend={legend}
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={yAxisTickFormatter}
          ticks={ticks}
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
          <ChevronRight className="size-4"/>
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