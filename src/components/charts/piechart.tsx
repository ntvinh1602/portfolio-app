"use client"

import { Pie, PieChart, Cell } from "recharts"
import { cn } from "@/lib/utils"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"

type PieChartData = {
  fill: string;
  [key: string]: unknown;
}

interface PiechartProps {
  data: PieChartData[] | undefined;
  chartConfig: ChartConfig;
  dataKey: string;
  nameKey: string;
  className?: string;
}

export function Piechart({ data, chartConfig, dataKey, nameKey, className }: PiechartProps) {
  return (
    <ChartContainer
      config={chartConfig}
      className={cn("mx-auto aspect-square", className)}
    >
      <PieChart margin={{ top: 10, bottom: 10 }}>
        <ChartLegend
          content={<ChartLegendContent nameKey={nameKey} />}
          className="text-md"
        />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          labelLine={false}
          label={({ payload, ...props }) => {
            const total = data?.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0) || 0;
            const value = Number(payload[dataKey]) || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
            return (
              <text
                cx={props.cx}
                cy={props.cy}
                x={props.x}
                y={props.y}
                textAnchor={props.textAnchor}
                dominantBaseline={props.dominantBaseline}
                fill="hsl(var(--foreground))"
              >
                {`${percentage}%`}
              </text>
            )
          }}
          innerRadius={"50%"}
          strokeWidth={5}
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
