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

export function ChartBarStacked<TData extends object>({
  data,
  config,
  className,
  labelKey,
  dataKeys,
  xAxisTickFormatter,
  xAxisDataKey,
}: {
  data: TData[]
  config: ChartConfig
  className?: string
  labelKey?: string
  dataKeys: string[]
  xAxisTickFormatter?: (value: string | number) => string
  xAxisDataKey: string
}) {

  return (
    <ChartContainer
      config={config}
      className={className}
    >
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
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          className="font-thin"
          tickFormatter={xAxisTickFormatter}
          interval="equidistantPreserveStart"
        />
        <YAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tickFormatter={(value: number) => compactNum(value)}
          className="font-thin"
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent />}
        />
        <ChartLegend
          content={<ChartLegendContent />}
          className="justify-center pt-3 gap-4"
        />
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            layout="vertical"
            stackId={key === "pnl" ? undefined : "a"}
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
