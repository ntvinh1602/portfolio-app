"use client"

import { Pie, PieChart, Sector } from "recharts"
import { PieSectorDataItem } from "recharts/types/polar/Pie"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart"

interface SummaryItem {
  type: string;
  totalAmount: number;
}

const chartConfig = {
  allocation: {
    label: "Allocation",
  },
  cash: {
    label: "Cash",
    color: "var(--chart-1)",
  },
  stocks: {
    label: "Stocks",
    color: "var(--chart-2)",
  },
  epf: {
    label: "EPF",
    color: "var(--chart-3)",
  },
  crypto: {
    label: "Crypto",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function Piechart({ data }: { data: SummaryItem[] | undefined }) {
  const chartData = data?.map(item => ({
    asset: item.type.toLowerCase(),
    allocation: item.totalAmount,
    fill: `var(--color-${item.type.toLowerCase()})`
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-w-sm"
    >
      <PieChart margin={{ top: 20, bottom: 20 }}>
        <ChartTooltip
          cursor={true}
          content={<ChartTooltipContent />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie
          data={chartData}
          dataKey="allocation"
          nameKey="asset"
          labelLine={false}
          label={({ payload, ...props }) => {
            const totalAllocation = chartData?.reduce((acc, curr) => acc + curr.allocation, 0) || 0;
            const percentage = totalAllocation > 0 ? ((payload.allocation / totalAllocation) * 100).toFixed(0) : 0;
            return (
              <text
                cx={props.cx}
                cy={props.cy}
                x={props.x}
                y={props.y}
                textAnchor={props.textAnchor}
                dominantBaseline={props.dominantBaseline}
                fill="hsla(var(--foreground))"
              >
                {`${percentage}%`}
              </text>
            )
          }}
          innerRadius={"50%"}
          strokeWidth={5}
          activeIndex={0}
          activeShape={({
            outerRadius = 0,
            ...props
          }: PieSectorDataItem) => (
            <Sector {...props} outerRadius={outerRadius + 10} />
          )}
        />
      </PieChart>
    </ChartContainer>
  )
}

