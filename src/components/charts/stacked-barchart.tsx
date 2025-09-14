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
  valueFormatter,
}: {
  data: TData[]
  config: ChartConfig
  className?: string
  labelKey?: string
  dataKeys: string[]
  xAxisTickFormatter?: (value: string | number) => string
  xAxisDataKey: string
  valueFormatter?: (value: number) => string
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
          content={
            <ChartTooltipContent valueFormatter={valueFormatter}/>
          }
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
