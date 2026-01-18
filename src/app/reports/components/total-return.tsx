import { Areachart } from "@/components/charts/areachart"
import { useDelayedData } from "@/hooks/useDelayedData"
import { formatNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
import * as Card from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

interface BenchmarkchartProps {
  year?: string | number
}

export function Benchmarkchart({ year }: BenchmarkchartProps) {
  const { twrData, benchmarkData, isLoading } = useDelayedData()

  // determine which dataset to render
  const selectedKey = year ? String(year) : "all_time"
  const chartData =
    benchmarkData[selectedKey as keyof typeof benchmarkData] ??
    benchmarkData["all_time"]

  const years =
    (new Date().getTime() - new Date("2021-11-09").getTime()) /
    (1000 * 60 * 60 * 24 * 365.25)
  const cagr = (Math.pow(1 + twrData.all_time, 1 / years) - 1) * 100

  const minorValue1 = twrData.all_time
  const minorValue2 = cagr

  const xAxisTickFormatter = (value: string | number) => {
    if (typeof value !== "string") return value.toString()
    const date = parseISO(value)
    if (isNaN(date.getTime())) return value
    return format(date, "MMM yy")
  }

  if (isLoading) {
    return (
      <Card.Root variant="glow" className="relative flex flex-col gap-4 h-full">
        <Card.Header className="items-center">
          <Card.Subtitle>
            Performance in {year || "All Time"}
          </Card.Subtitle>
          <Card.Title className="text-2xl">
            <Skeleton className="h-8 w-32" />
          </Card.Title>
          <Card.Action className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <Skeleton className="h-4 w-10 mb-1" />
              <Card.Subtitle className="text-xs">all time</Card.Subtitle>
            </div>
            <Separator orientation="vertical" className="data-[orientation=vertical]:h-8 -mr-1" />
            <div className="flex flex-col items-end">
              <Skeleton className="h-4 w-10 mb-1" />
              <Card.Subtitle className="text-xs">annualized</Card.Subtitle>
            </div>
          </Card.Action>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 h-full">
          <Skeleton className="w-full h-full" />
        </Card.Content>
      </Card.Root>
    )
  }

  return (
    <Card.Root variant="glow" className="relative flex flex-col gap-0 h-full">
      <Card.Header className="items-center">
        <Card.Subtitle>
          {year ? `Performance in ${year}` : "All-Time Performance"}
        </Card.Subtitle>
        <Card.Title className="text-2xl">
        </Card.Title>
        <Card.Action className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {minorValue1 < 0 ? (
                <TrendingDown className="text-red-700" />
              ) : (
                <TrendingUp className="text-green-500" />
              )}
              {`${formatNum(Math.abs(minorValue1 * 100), 1)}%`}
            </div>
            <Card.Subtitle className="text-xs">all time</Card.Subtitle>
          </div>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-8 -mr-1"
          />
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-thin text-sm [&_svg]:size-5">
              {minorValue2 < 0 ? (
                <TrendingDown className="text-red-700" />
              ) : (
                <TrendingUp className="text-green-500" />
              )}
              {`${formatNum(Math.abs(minorValue2), 1)}%`}
            </div>
            <Card.Subtitle className="text-xs">annualized</Card.Subtitle>
          </div>
        </Card.Action>
      </Card.Header>

      <Card.Content className="flex flex-col gap-4 h-full pt-4">
        <Areachart
          data={chartData}
          config={{
            portfolio_value: {
              label: "Equity",
              color: "var(--chart-2)",
            },
            vni_value: {
              label: "VN-Index",
              color: "var(--chart-1)",
            },
          }}
          className="h-full w-full"
          xAxisDataKey="snapshot_date"
          dataKeys={["portfolio_value", "vni_value"]}
          legend
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
          valueFormatter={(value) => formatNum(value, 1)}
        />
      </Card.Content>
    </Card.Root>
  )
}
