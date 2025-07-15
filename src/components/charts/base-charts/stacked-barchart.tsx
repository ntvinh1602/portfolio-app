"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  LabelList,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { compactNum } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type ChartBarStackedProps<TData extends object> = {
  data: TData[]
  config: ChartConfig
  className?: string
  labelKey?: string
}

export function ChartBarStacked<TData extends object>({
  data,
  config,
  className,
  labelKey,
}: ChartBarStackedProps<TData>) {
  const keys = Object.keys(config)

  return (
    <ChartContainer
      config={config}
      className={className}
    >
      <BarChart 
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ right: 20 }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="month"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          className="font-thin"
        />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tickFormatter={(value: number) => compactNum(value)}
          className="font-thin"
        />
        <ChartLegend 
          content={<ChartLegendContent />}
          className="pl-8 font-thin"
        />
        {keys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            layout="vertical"
            stackId="a"
            fill={`var(--color-${key})`}
          >
            {labelKey && index === keys.length - 1 && (
              <LabelList
                dataKey={labelKey}
                position="right"
                offset={8}
                className="fill-foreground font-thin"
                fontSize={12}
                formatter={(value: number) => compactNum(value)}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}

export function BarStackedSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 py-4">
      <div className="flex flex-1 gap-4">
        <div className="flex w-12 flex-col justify-between gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        <div className="flex-1 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between pl-16">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-12" />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-3" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
