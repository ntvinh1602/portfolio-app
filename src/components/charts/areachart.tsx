"use client"

import { CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent, 
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface LinechartProps {
  data: Record<string, string | number>[]
  chartConfig: ChartConfig
  className?: string
  xAxisDataKey: string
  lineDataKeys: string[]
  legend?: boolean
  xAxisTickFormatter?: (value: string | number) => string
  yAxisTickFormatter?: (value: string | number) => string
  valueFormatter?: (value: number) => string
}

export function Areachart({
  data,
  chartConfig,
  className,
  xAxisDataKey,
  lineDataKeys,
  legend = false,
  xAxisTickFormatter,
  yAxisTickFormatter,
  valueFormatter,
}: LinechartProps) {
  return (
    <ChartContainer config={chartConfig} className={cn(className)}>
      <AreaChart data={data}>
        <defs>
          {lineDataKeys.map((key) => (
            <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.8}
              />
              <stop
                offset="50%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.1}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisDataKey}
          tickLine={true}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xAxisTickFormatter}
          className="font-light"
          interval="equidistantPreserveStart"
          minTickGap={60}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={yAxisTickFormatter}
          domain={[
            (dataMin: number) => Number(dataMin) * 0.99,
            (dataMax: number) => Number(dataMax) * 1.01,
          ]}
          allowDataOverflow={true}
          className="font-light"
        />
        <ChartTooltip
          cursor={true}
          content={
            <ChartTooltipContent indicator="line" valueFormatter={valueFormatter}/>
          }
        />
        {lineDataKeys.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type="natural"
            connectNulls={true}
            stroke={`var(--color-${key})`}
            strokeWidth={1.5}
            fill={`url(#fill-${key})`}
            dot={false}
          />
        ))}
        {legend && <ChartLegend 
          content={<ChartLegendContent />}
          className="gap-4 justify-center pt-3 text-muted-foreground"
        />}
      </AreaChart>
    </ChartContainer>
  )
}