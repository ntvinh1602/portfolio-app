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
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={yAxisTickFormatter}
          domain={["dataMin - 10", "dataMax + 10"]}
          allowDataOverflow={true}
        />
        {lineDataKeys.map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="natural"
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={false}
          />
        ))}
        {legend && <ChartLegend content={<ChartLegendContent />} />}
      </LineChart>
    </ChartContainer>
  )
}