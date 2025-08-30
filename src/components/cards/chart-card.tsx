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

interface ChartCardProps<TData extends Record<string, unknown>> {
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
  xAxisTickFormatter?: (value: string | number) => string
  yAxisTickFormatter?: (value: string | number) => string
  children?: React.ReactNode
  ticks?: (string | number)[]
}

function ChartCard<TData extends Record<string, unknown>>({
  cardClassName,
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
  xAxisTickFormatter,
  yAxisTickFormatter,
  children,
  ticks,
}: ChartCardProps<TData>) {
  const router = useRouter()
  const handleNavigation = () => {
    router.push(descriptionLink)
  }

  return (
    <Card className={`flex flex-col gap-2 h-full ${cardClassName}`}>
      <CardHeader className="px-4">
        <CardDescription
          className="flex items-center w-fit"
          onClick={handleNavigation}
        >
          {description}<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl">
          {titleValue ? titleValueFormatter(titleValue) : "Loading..."}
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
      <CardContent className="px-4 flex flex-col gap-2 h-full">
        {children}
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