"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { subDays, format } from "date-fns"
import { Linechart } from "@/components/charts/linechart"
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

  const fetchData = useCallback(async () => {
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("An unknown error occurred")
      }
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
              <Linechart
                data={chartData}
                chartConfig={{
                  net_equity_value: {
                    label: "Equity",
                    color: "var(--chart-2)",
                  },
                }}
                className="h-[250px] w-full"
                xAxisDataKey="date"
                lineDataKey="net_equity_value"
                grid={true}
                xAxisTickFormatter={(value) => format(new Date(value), "MMM yy")}
                yAxisTickFormatter={(value) => `${formatNum(Number(value) / 1000000)} m`}
              />
            </div>
          )}
        </div>
      </PageContent>
    </PageMain>
  )
}
