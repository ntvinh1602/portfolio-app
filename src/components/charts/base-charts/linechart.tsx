"use client"

import { CartesianGrid, XAxis, YAxis, Line, LineChart } from "recharts"
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

export function Linechart({
  data,
  chartConfig,
  className,
  xAxisDataKey,
  lineDataKeys,
  grid = false,
  legend = false,
  xAxisTickFormatter,
  yAxisTickFormatter,
}: LinechartProps) {
  return (
    <ChartContainer config={chartConfig} className={cn(className)}>
      <LineChart data={data}>
        <CartesianGrid horizontal={grid} vertical={false} />
        <XAxis
          dataKey={xAxisDataKey}
          tickLine={false}
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
        {lineDataKeys.map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="natural"
            connectNulls={true}
            stroke={`var(--color-${key})`}
            strokeWidth={1.5}
            dot={false}
          />
        ))}
        {legend && <ChartLegend content={<ChartLegendContent />} className="font-thin"/>}
      </LineChart>
    </ChartContainer>
  )
}