"use client"

import { useState } from "react"
import { EquityChart } from "./equity"
import { ReturnChart } from "./return"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Dashboard } from "@fund/fund.types"

export default function TimeAdjustedCharts({ data }: { data: Dashboard }) {
  const [dateRange, setDateRange] = useState("1y")
  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <ToggleGroup
        type="single"
        value={dateRange}
        onValueChange={setDateRange}
        spacing={1}
        className="w-full"
      >
        <ToggleGroupItem value="3m" className="flex-1">
          3 months
        </ToggleGroupItem>
        <ToggleGroupItem value="6m" className="flex-1">
          6 months
        </ToggleGroupItem>
        <ToggleGroupItem value="1y" className="flex-1">
          1 year
        </ToggleGroupItem>
        <ToggleGroupItem value="all" className="flex-1">
          All time
        </ToggleGroupItem>
      </ToggleGroup>
      <EquityChart
        dateRange={dateRange}
        chartData={data.equitychart}
        totalEquity={data.total_equity}
        pnlMtd={data.pnl_mtd}
        pnlYtd={data.pnl_ytd}
      />
      <ReturnChart
        dateRange={dateRange}
        chartData={data.returnchart}
        twrYtd={data.twr_ytd}
        twrAll={data.twr_all}
        cagr={data.cagr}
      />
    </div>
  )
}
