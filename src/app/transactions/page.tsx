"use client"

import { useState } from "react"
import { subMonths } from "date-fns"
import { DateRange } from "@/components/date-picker"
import { Header } from "@/components/header"
import { DataTable } from "./table/data-table"
import { columns } from "./table/columns"
import { useTransactions } from "@/hooks/useTransactions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Preset = "1M" | "3M" | "6M" | "1Y" | "CUSTOM"

export default function TransactionsPage() {
  const [preset, setPreset] = useState<Preset>("3M")
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 1),
    endDate: new Date(),
  })

  const { data, error } = useTransactions(dateRange)

  // Handle preset change
  const handlePresetChange = (value: Preset) => {
    setPreset(value)
    if (value === "1M") {
      setDateRange({
        startDate: subMonths(new Date(), 1),
        endDate: new Date(),
      })
    } else if (value === "3M") {
      setDateRange({
        startDate: subMonths(new Date(), 3),
        endDate: new Date(),
      })
    } else if (value === "6M") {
      setDateRange({
        startDate: subMonths(new Date(), 6),
        endDate: new Date(),
      })
    } else if (value === "1Y") {
      setDateRange({
        startDate: subMonths(new Date(), 12),
        endDate: new Date(),
      })
    }
  }

  return (
    <div>
      <Header title="Transactions" />
      <div className="flex flex-col w-8/10 mx-auto gap-2 pb-40">
        {error && (
          <div className="text-red-500 text-sm">
            Error fetching transactions: {error.message}
          </div>
        )}

        <DataTable columns={columns} data={data ?? []}>
          <div className="flex items-center gap-2">
            <Select
              value={preset}
              onValueChange={(v) => handlePresetChange(v as Preset)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">Last 1 months</SelectItem>
                <SelectItem value="3M">Last 3 months</SelectItem>
                <SelectItem value="6M">Last 6 months</SelectItem>
                <SelectItem value="1Y">Last 1 year</SelectItem>
                <SelectItem value="CUSTOM">Custom...</SelectItem>
              </SelectContent>
            </Select>

            {preset === "CUSTOM" && (
              <DateRange
                dateFrom={dateRange.startDate}
                dateTo={dateRange.endDate}
                onDateFromChange={(date) =>
                  setDateRange((prev) => ({ ...prev, startDate: date }))
                }
                onDateToChange={(date) =>
                  setDateRange((prev) => ({ ...prev, endDate: date }))
                }
              />
            )}
          </div>
        </DataTable>
      </div>
    </div>
  )
}
