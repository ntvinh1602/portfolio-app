"use client"

import { useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EquityChart } from "@fund/components/chart/equity-chart"
import { ReturnChart } from "@fund/components/chart/return-chart"
import type { Dashboard } from "@fund/fund.types"
import { withAllTime } from "@fund/config"

export function EquityReturn({ data }: { data: Dashboard }) {
  const [dateRange, setDateRange] = useState("last_1y")
  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="flex bg-card gap-2 p-1 rounded-4xl items-center">
        <Button variant="ghost" size="icon-lg" className="pointer-events-none">
          <Calendar />
        </Button>
        <ToggleGroup
          type="single"
          value={dateRange}
          onValueChange={setDateRange}
          spacing={1}
          className="w-full"
        >
          {withAllTime.map(({ key, label }) => (
            <ToggleGroupItem key={key} value={key} className="flex-1">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <EquityChart
        dateRange={dateRange}
        chartData={data.equitychart}
        data={data}
      />
      <ReturnChart
        dateRange={dateRange}
        chartData={data.returnchart}
        data={data}
      />
    </div>
  )
}
