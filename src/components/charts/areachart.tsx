import { CartesianGrid, XAxis, YAxis, Area, AreaChart } from "recharts"
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

export function Areachart({
  data,
  config,
  className,
  xAxisDataKey,
  xAxisTickFormatter,
  yAxisTickFormatter,
  tooltipFormatter,
}: {
  data: Record<string, string | number>[]
  config: ChartConfig
  className?: string
  xAxisDataKey: string
  xAxisTickFormatter?: (value: string) => string
  yAxisTickFormatter?: (value: number) => string
  tooltipFormatter?: (value: number) => string
}) {
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
