import {
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  type TooltipPayloadEntry,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ReactNode } from "react"

export type TooltipLabelFormatter = (
  label: unknown,
  payload: readonly TooltipPayloadEntry[],
) => ReactNode

type Props = {
  data: Record<string, string | number>[]
  config: ChartConfig
  className?: string
  xAxisDataKey: string
  xAxisType?: "category" | "number"
  xAxisTickFormatter?: (ms: number) => string
  yAxisTickFormatter?: (value: number) => string
  tooltipFormatter?: (value: number) => string // value formatter, unchanged
  tooltipLabelFormatter?: TooltipLabelFormatter // NEW, separate prop
}

export function Areachart({
  data,
  config,
  className,
  xAxisDataKey,
  xAxisType,
  xAxisTickFormatter,
  yAxisTickFormatter,
  tooltipFormatter,
  tooltipLabelFormatter,
}: Props) {
  const dataKeys = Object.keys(config)
  const isMobile = useIsMobile()

  return (
    <ChartContainer config={config} className={cn(className)}>
      <AreaChart data={data} margin={{}}>
        <defs>
          {dataKeys.map((key) => (
            <linearGradient
              key={key}
              id={`fill-${key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.5}
              />
              <stop
                offset="100%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisDataKey}
          {...(xAxisType === "number"
            ? { type: "number", scale: "time", domain: ["dataMin", "dataMax"] }
            : {})}
          tickLine={true}
          axisLine={false}
          tickMargin={8}
          tickFormatter={xAxisTickFormatter}
          interval="preserveEnd"
          minTickGap={60}
        />
        <YAxis
          orientation="left"
          tickLine={false}
          axisLine={false}
          tickMargin={0}
          tickFormatter={yAxisTickFormatter}
          domain={[
            (dataMin: number) => Number(dataMin) * 1,
            (dataMax: number) => Number(dataMax) * 1.05,
          ]}
          allowDataOverflow={false}
          scale="linear"
          mirror={true}
          tick={{
            fill: "var(--muted-foreground)",
            className: "opacity-80",
          }}
        />
        {!isMobile && (
          <ChartTooltip
            cursor={true}
            content={
              <ChartTooltipContent
                indicator="line"
                valueFormatter={tooltipFormatter}
                labelFormatter={tooltipLabelFormatter}
              />
            }
          />
        )}
        {dataKeys.map((key) => (
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
        <ChartLegend
          content={<ChartLegendContent />}
          className="gap-4 justify-center pt-3 text-muted-foreground"
        />
      </AreaChart>
    </ChartContainer>
  )
}
