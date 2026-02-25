import { ChartCard } from "@/components/chart-card"
import { formatNum } from "@/lib/utils"
import { Areachart } from "@/components/charts/areachart"

interface ReturnChartPoint {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
  [key: string]: string | number
}

interface ReturnChartProps {
  dateRange: string
  onDateRangeChange: (range: string) => void
  chartData: ReturnChartPoint[]

  twrYtd: number
  twrAll: number
  inceptionDate: string
}

export function ReturnChart({
  dateRange,
  onDateRangeChange,
  chartData,
  twrYtd,
  twrAll,
  inceptionDate
}: ReturnChartProps) {

  const start = new Date(inceptionDate).getTime()
  const now = Date.now()

  const years =
    (now - start) /
    (1000 * 60 * 60 * 24 * 365.25)

  const cagr =
    years > 0
      ? (Math.pow(1 + twrAll, 1 / years) - 1) * 100
      : 0

  return (
    <ChartCard
      title="Return"
      majorValue={twrYtd}
      majorValueFormatter={(v) =>
        `${formatNum(v * 100, 1)}%`
      }
      description="this year"
      minorValue1={twrAll}
      minorValue1Formatter={(v) =>
        `${formatNum(v * 100, 1)}%`
      }
      minorText1="all time"
      minorValue2={cagr}
      minorValue2Formatter={(v) =>
        `${formatNum(v, 1)}%`
      }
      minorText2="annualized"
      chartComponent={Areachart}
      chartData={chartData}
      chartConfig={{
        portfolio_value: {
          label: "Equity",
          color: "var(--chart-1)"
        },
        vni_value: {
          label: "VN-Index",
          color: "var(--chart-2)"
        }
      }}
      chartClassName="h-full w-full"
      chartDataKeys={["portfolio_value", "vni_value"]}
      legend
      yAxisTickFormatter={(v) =>
        formatNum(Number(v))
      }
      tooltipValueFormatter={(v) =>
        formatNum(v, 1)
      }
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
    />
  )
}