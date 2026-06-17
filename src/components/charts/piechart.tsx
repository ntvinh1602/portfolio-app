import { Pie, PieChart, Cell, Label } from "recharts"
import { cn } from "@/lib/utils"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function Piechart({
  data,
  chartConfig,
  dataKey,
  nameKey,
  className,
  innerRadius = 50,
  legend,
  centerText,
  centerValue,
  margin_tb = 10,
  valueFormatter
}: {
  data: Record<string, unknown>[]
  chartConfig: ChartConfig
  dataKey: string
  nameKey: string
  className?: string
  innerRadius?: number
  legend?: string
  centerText?: string
  centerValue?: string
  margin_tb?: number
  label_pos?: number
  valueFormatter?: (value: number) => string
}) {

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
            className="justify-center gap-4"
          />
        )}
        {legend === "right" && (
          <ChartLegend
            content={<ChartLegendContent nameKey={nameKey} />}
            layout="vertical"
            align="right"
            verticalAlign="middle"
            className="flex-col items-start w-15 gap-1 text-muted-foreground"
          />
        )}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent indicator="line" valueFormatter={valueFormatter} />
          }
        />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          labelLine={false}
          innerRadius={`${innerRadius}%`}
          strokeWidth={5}
          className="font-thin"
        >
          {data?.map((entry, index) => {
            const key = entry[nameKey] as string
            const color = chartConfig[key]?.color

            return (
              <Cell key={`cell-${index}`} fill={color} />
            )
          })}

          {centerText && (
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 20}
                        className="fill-foreground text-lg md:text-xl font-medium"
                      >
                        {centerValue}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-muted-foreground text-sm font-medium"
                      >
                        {centerText}
                      </tspan>
                    </text>
                  )
                }
              }}
            />
          )}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
