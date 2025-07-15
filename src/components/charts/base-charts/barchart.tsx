"use client"

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart"

interface BarChartProps {
  data: Record<string, string | number>[]
  config: ChartConfig
  dataKey: string
  categoryKey: string
  className?: string
  xAxisTickFormatter?: (value: string | number) => string;
  yAxisTickFormatter?: (value: string | number) => string;
}

export function BarChart({
  data,
  config,
  dataKey,
  categoryKey,
  className,
  xAxisTickFormatter,
  yAxisTickFormatter
}: BarChartProps) {
  return (
    <ChartContainer config={config} className={className}>
      <RechartsBarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <YAxis
          dataKey={dataKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={yAxisTickFormatter}
          className="font-thin"          
        />
        <XAxis
          dataKey={categoryKey}
          tickLine={true}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xAxisTickFormatter}
          className="font-thin"
        />
        <Bar dataKey={dataKey} radius={4}>
          {data.map((item) => (
            <Cell
              key={item[categoryKey]}
              fill={Number(item[dataKey]) > 0 ? "var(--chart-1)" : "var(--chart-2)"}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ChartContainer>
  )
}
