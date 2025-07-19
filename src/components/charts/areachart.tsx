"use client"

import { CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface LinechartProps {
  data: Record<string, string | number>[]
  chartConfig: ChartConfig
  className?: string
  xAxisDataKey: string
  lineDataKeys: string[]
  grid?: boolean
  legend?: boolean
  xAxisTickFormatter?: (value: string | number) => string
  yAxisTickFormatter?: (value: string | number) => string
}

export function Areachart({
  data,
  chartConfig,
  className,
  xAxisDataKey,
  lineDataKeys: areaDataKeys,
  grid = false,
  legend = false,
  xAxisTickFormatter,
  yAxisTickFormatter,
}: LinechartProps) {
  return (
    <ChartContainer config={chartConfig} className={cn(className)}>
      <AreaChart data={data}>
        <defs>
          {areaDataKeys.map((key) => (
            <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.4}
              />
              <stop
                offset="80%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.1}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid horizontal={grid} vertical={false} />
        <XAxis
          dataKey={xAxisDataKey}
          tickLine={true}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xAxisTickFormatter}
          className="font-thin"
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
          className="font-thin"
        />
        {areaDataKeys.map((key) => (
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
        {legend && <ChartLegend content={<ChartLegendContent />} className="font-thin"/>}
      </AreaChart>
    </ChartContainer>
  )
}