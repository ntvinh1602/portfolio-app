"use client"

import { CartesianGrid, XAxis, YAxis, Line, LineChart } from "recharts"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface LinechartProps {
  data: any[];
  chartConfig: ChartConfig;
  className?: string;
  xAxisDataKey: string;
  lineDataKey: string;
  grid: boolean;
  xAxisTickFormatter?: (value: any) => string;
  yAxisTickFormatter?: (value: any) => string;
}

export function Linechart({
  data,
  chartConfig,
  className,
  xAxisDataKey,
  lineDataKey,
  grid,
  xAxisTickFormatter,
  yAxisTickFormatter
}: LinechartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className={cn(className)}
    >
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
          domain={['dataMin - 10', 'dataMax + 10']}
          allowDataOverflow={true}
        />
        <Line
          dataKey={lineDataKey}
          type="natural"
          stroke={`var(--color-${lineDataKey})`}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}