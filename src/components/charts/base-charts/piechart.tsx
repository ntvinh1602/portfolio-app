"use client"

import { Pie, PieChart, Cell, Label } from "recharts"
import { cn } from "@/lib/utils"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { compactNum } from "@/lib/utils"

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
  innerRadius?: number;
  legend?: string;
  label?: boolean;
  centerText?: string;
  margin_tb?: number
}

function Piechart({ data, chartConfig, dataKey, nameKey, className, innerRadius, legend, label, centerText, margin_tb = 10 }: PiechartProps) {
  const totalValue = data?.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0) || 0;
  const renderLabel = ({ payload, ...props }: { payload: PieChartData; cx: number; cy: number; x: number; y: number; textAnchor: string; dominantBaseline: string; }) => {
    const value = Number(payload[dataKey]) || 0;
    const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(0) : 0;
    return (
      <text
        cx={props.cx}
        cy={props.cy}
        x={props.x}
        y={props.y}
        textAnchor={props.textAnchor}
        dominantBaseline={props.dominantBaseline}
        fill="var(--foreground)"
      >
        {`${percentage}%`}
      </text>
    )
  };

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("mx-auto", legend !== "right" && "aspect-square", className)}
    >
      <PieChart margin={{ top: margin_tb, bottom: margin_tb }}>
        {legend === "bottom" && (
          <ChartLegend
            content={<ChartLegendContent nameKey={nameKey} />}
            verticalAlign="bottom"
            className="mt-4 text-md"
          />
        )}
        {legend === "right" && (
          <ChartLegend
            content={<ChartLegendContent nameKey={nameKey} />}
            layout="vertical"
            align="right"
            verticalAlign="middle"
            className="text-md flex flex-col items-start w-15"
          />
        )}
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          labelLine={false}
          label={label !== false && renderLabel}
          innerRadius={!innerRadius ? "50%" : `${innerRadius}%`}
          strokeWidth={5}
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
          {
            centerText &&
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="auto"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-xl font-bold"
                      >
                        {compactNum(totalValue)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground"
                      >
                        {centerText}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          }
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

function PiechartSkeleton() {
  return (
    <div className="flex flex-col items-center gap-y-4 py-8">
      <Skeleton className="h-48 w-48 rounded-full" />
      <div className="flex items-center gap-x-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>
  )
}

export {
  Piechart,
  PiechartSkeleton
}