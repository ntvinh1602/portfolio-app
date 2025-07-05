"use client"

import { useState } from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { subDays, format } from "date-fns"

export default function Page() {
  const [startDate, setStartDate] = useState<Date | undefined>(
    subDays(new Date(), 30)
  )
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [twr, setTwr] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.")
      return
    }

    setLoading(true)
    setError(null)
    setTwr(null)

    try {
      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
      })
      const response = await fetch(`/api/performance?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch performance data.")
      }

      const data = await response.json()
      setTwr(data.twr)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageMain>
      <PageHeader title="Performance" />
      <PageContent>
        <div className="flex flex-col gap-4 max-w-md">
          <div className="grid grid-cols-2 gap-4">
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
          <Button onClick={handleCalculate} disabled={loading}>
            {loading ? "Calculating..." : "Calculate"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {twr !== null && (
            <div className="p-4 bg-card rounded-lg">
              <h3 className="text-lg font-semibold">Time-Weighted Return (TWR)</h3>
              <p className="text-2xl font-bold">{(twr * 100).toFixed(2)}%</p>
            </div>
          )}
        </div>
      </PageContent>
    </PageMain>
  )
}
