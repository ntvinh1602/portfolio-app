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
        />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tickFormatter={(value: number) => compactNum(value)}
        />
        <ChartLegend 
          content={<ChartLegendContent />}
          className="pl-8"
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
                className="fill-foreground"
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
