"use client"

import { Pie, PieChart, Cell, Label } from "recharts"
import { cn, compactNum } from "@/lib/utils"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

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
  margin_tb?: number;
  label_pos?: number;
}

function Piechart({
  data,
  chartConfig,
  dataKey,
  nameKey,
  className,
  innerRadius = 50,
  legend,
  label,
  centerText,
  margin_tb = 10,
  label_pos = 1.5
}: PiechartProps) {
  const totalValue = data?.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0) || 0;

  const RADIAN = Math.PI / 180;

interface RenderLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  payload: PieChartData;
}

  const renderLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    payload
  }: RenderLabelProps) => {
    const radius = innerRadius + (outerRadius - innerRadius) * label_pos;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const value = Number(payload[dataKey]) || 0;
    const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(0) : 0;

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--foreground)"
        className="text-xs font-light"
      >
        {`${percentage}%`}
      </text>
    );
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
            className="mt-4 text-md font-thin"
          />
        )}
        {legend === "right" && (
          <ChartLegend
            content={<ChartLegendContent nameKey={nameKey} />}
            layout="vertical"
            align="right"
            verticalAlign="middle"
            className="text-md flex flex-col items-start w-15 font-thin"
          />
        )}

        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          labelLine={false}
          label={label !== false && renderLabel}
          innerRadius={`${innerRadius}%`}
          strokeWidth={5}
          className="font-thin"
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}

          {centerText && (
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
                        className="fill-foreground text-xl font-light"
                      >
                        {compactNum(totalValue)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="fill-muted-foreground font-thin"
                      >
                        {centerText}
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          )}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
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
  );
}

export {
  Piechart,
  PiechartSkeleton
}
