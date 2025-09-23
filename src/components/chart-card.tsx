"use client"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Root,
  Action,
  Content,
  Subtitle,
  Footer,
  Header,
  Title,
} from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { ChartConfig } from "@/components/ui/chart"
import { parseISO, format } from "date-fns"
import { TabSwitcher } from "@/components/tab-switcher"
import { Separator } from "@/components/ui/separator"

interface ChartCardProps<
  TData extends { snapshot_date: string; [key: string]: number | string }
> {
  cardClassName?: string
  description: string
  majorValue: number | null
  majorValueFormatter: (value: number) => string
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
  xAxisDataKey: string
  chartDataKeys: string[]
  legend?: boolean
  xAxisTickFormatter?: (value: string | number) => string
  yAxisTickFormatter?: (value: string | number) => string
  tooltipValueFormatter?: (value: number) => string
  children?: React.ReactNode
  dateRange?: string
  onDateRangeChange?: (value: string) => void
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
  chartDataKeys,
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
    <Root className="flex flex-col gap-0 h-full">
      <Header className="px-4 items-center">
        <Subtitle>{description}</Subtitle>
        <Title className="text-2xl">
          {majorValue && majorValueFormatter(majorValue)}
        </Title>
        {minorValue1 && minorValue2 && (
          <Action className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
                {minorValue1 !== null && minorValue1 < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                {minorValue1 !== null && minorValue1Formatter?.(Math.abs(minorValue1))}
              </div>
              <Subtitle className="text-xs">{minorText1}</Subtitle>
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
                {minorValue2 !== null && minorValue2Formatter?.(Math.abs(minorValue2))}
              </div>
              <Subtitle className="text-xs">{minorText2}</Subtitle>
            </div>
          </Action>
        )}
      </Header>
      <Content className="px-4 flex flex-col gap-1 h-full">
        {dateRange && onDateRangeChange && (
          <TabSwitcher
            value={dateRange}
            onValueChange={onDateRangeChange}
            options={[
              { label: "3M", value: "3m" },
              { label: "6M", value: "6m" },
              { label: "1Y", value: "1y" },
              { label: "All", value: "all_time" }
            ]}
            variant="switch"
            tabClassName="ml-auto"
            triggerClassName="w-[50px]"
          />
        )}
        <ChartComponent
          data={chartData}
          config={chartConfig}
          className={chartClassName}
          xAxisDataKey={xAxisDataKey}
          dataKeys={chartDataKeys}
          legend={legend}
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={yAxisTickFormatter}
          valueFormatter={tooltipValueFormatter}
        />
      </Content>
    </Root>
  )
}

function ChartCardSkeleton({ cardClassName, chartHeight }: { cardClassName?: string, chartHeight: string }) {
  return (
    <Root className={`gap-4 h-full ${cardClassName}`}>
      <Header className="px-4">
        <Subtitle className="flex items-center w-fit">
          <Skeleton className="h-4 w-24" />
        </Subtitle>
        <Title className="text-2xl">
          <Skeleton className="h-8 w-32" />
        </Title>
        <Action className="flex flex-col gap-1 items-end">
          <Skeleton className="h-4 w-16" />
          <Subtitle className="text-xs">
            <Skeleton className="h-3 w-20" />
          </Subtitle>
        </Action>
      </Header>
      <Footer className="px-4">
        <Skeleton className={`w-full ${chartHeight}`} />
      </Footer>
    </Root>
  )
}

export {
  ChartCard,
  ChartCardSkeleton
}