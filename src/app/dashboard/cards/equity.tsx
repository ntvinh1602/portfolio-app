"use client"

import { ChartCard } from "@/components/chart-card"
import { formatNum, compactNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"

interface EquityChartPoint {
  snapshot_date: string
  net_equity: number
  cumulative_cashflow: number
  [key: string]: string | number
}

interface EquityChartProps {
  dateRange: string
  onDateRangeChange: (range: string) => void
  chartData: EquityChartPoint[]

  totalEquity: number
  pnlMtd: number
  pnlYtd: number
}

export function EquityChart({
  dateRange,
  onDateRangeChange,
  chartData,
  totalEquity,
  pnlMtd,
  pnlYtd
}: EquityChartProps) {
  return (
    <ChartCard
      title="Equity"
      majorValue={totalEquity}
      majorValueFormatter={formatNum}
      minorValue1={pnlMtd}
      minorValue1Formatter={compactNum}
      minorText1="this month"
      minorValue2={pnlYtd}
      minorValue2Formatter={compactNum}
      minorText2="this year"
      chartComponent={Areachart}
      chartData={chartData}
      chartConfig={{
        net_equity: {
          label: "Equity",
          color: "var(--chart-1)"
        },
        cumulative_cashflow: {
          label: "Paid-in Capital",
          color: "var(--chart-2)"
        }
      }}
      chartClassName="h-full w-full"
      chartDataKeys={[
        "net_equity",
        "cumulative_cashflow"
      ]}
      legend
      yAxisTickFormatter={(v) =>
        compactNum(Number(v))
      }
      tooltipValueFormatter={(v) =>
        formatNum(v)
      }
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
    />
  )
}