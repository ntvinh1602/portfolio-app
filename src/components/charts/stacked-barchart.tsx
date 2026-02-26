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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { compactNum } from "@/lib/utils"

export function ChartBarStacked<
  TData extends Record<string, string | number | undefined>
>({
  data,
  config,
  className,
  labelKey,
  xAxisTickFormatter,
  xAxisDataKey,
  tooltipFormatter,
}: {
  data: TData[]
  config: ChartConfig
  className?: string
  labelKey?: string
  xAxisTickFormatter?: (value: string) => string
  xAxisDataKey: string
  tooltipFormatter?: (value: number) => string
}) {
  const dataKeys = Object.keys(config)
  return (
    <ChartContainer config={config} className={className}>
      <BarChart
        accessibilityLayer
        data={data}
        layout="horizontal"
        margin={{ top: 20, left: -10 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xAxisDataKey}
          type="category"
          tickLine={true}
          tickMargin={10}
          axisLine={false}
          className="font-light"
          tickFormatter={xAxisTickFormatter}
          interval="equidistantPreserveStart"
        />
        <YAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tickFormatter={(value: number) => compactNum(value)}
          className="font-light"
        />
        <ChartTooltip
          cursor={true}
          content={<ChartTooltipContent valueFormatter={tooltipFormatter} />}
        />
        <ChartLegend
          content={<ChartLegendContent />}
          className="justify-center pt-3 gap-4 text-muted-foreground"
        />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            layout="vertical"
            stackId={key === "revenue" ? undefined : "a"}
            fill={`var(--color-${key})`}
          >
            {labelKey && index === dataKeys.length - 1 && (
              <LabelList
                dataKey={labelKey}
                position="right"
                offset={8}
                className="fill-foreground font-thin"
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
