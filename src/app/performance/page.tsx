"use client"

import { useState, useEffect } from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { subDays, format } from "date-fns"
import {
  ChartContainer
} from "@/components/ui/chart"
import { CartesianGrid, XAxis, YAxis, Line, LineChart } from "recharts"
import { formatNum } from "@/lib/utils"

type EquityData = {
  date: string
  net_equity_value: number
}

export default function Page() {
  const [startDate, setStartDate] = useState<Date | undefined>(
    subDays(new Date(), 90)
  )
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [twr, setTwr] = useState<number | null>(null)
  const [chartData, setChartData] = useState<EquityData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.")
      return
    }

    setLoading(true)
    setError(null)
    setTwr(null)
    setChartData([])

    try {
      // Fetch TWR
      const twrParams = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      })
      const twrResponse = await fetch(`/api/performance?${twrParams.toString()}`)
      if (!twrResponse.ok) {
        const errorData = await twrResponse.json()
        throw new Error(errorData.error || "Failed to fetch TWR data.")
      }
      const twrData = await twrResponse.json()
      setTwr(twrData.twr)

      // Fetch Equity Chart Data
      const equityParams = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        threshold: "200",
      })
      const equityResponse = await fetch(
        `/api/performance/equity?${equityParams.toString()}`
      )
      if (!equityResponse.ok) {
        const errorData = await equityResponse.json()
        throw new Error(errorData.error || "Failed to fetch equity data.")
      }
      const equityData = await equityResponse.json()
      setChartData(equityData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <PageMain>
      <PageHeader title="Performance" />
      <PageContent>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <DatePicker
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
            />
            <DatePicker
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
            />
          </div>
          <Button onClick={fetchData} disabled={loading} className="max-w-md">
            {loading ? "Calculating..." : "Calculate"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {twr !== null && (
            <div className="p-4 bg-card rounded-lg max-w-md">
              <h3 className="text-lg font-semibold">
                Equity Return
              </h3>
              <p className="text-2xl font-bold">{(twr * 100).toFixed(2)}%</p>
            </div>
          )}
          {chartData.length > 0 && (
            <div className="p-4 bg-card rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Equity</h3>
              <ChartContainer
                config={{
                  net_equity_value: {
                    label: "Equity",
                    color: "var(--chart-2)",
                  },
                }}
                className="h-[250px] w-full"
              >
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => format(new Date(value), "MMM yy")}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `${formatNum(value/1000000)} m`}
                  />
                  <Line
                    dataKey="net_equity_value"
                    type="natural"
                    stroke="var(--color-net_equity_value)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          )}
        </div>
      </PageContent>
    </PageMain>
  )
}
