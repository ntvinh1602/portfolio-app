"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EquityChartSection } from "./equity-chart-section"
import { ReturnChartSection } from "./return-chart-section"
import { useDashboardDateRange } from "./context"

const withAllTime = [
  { key: "last_3m", label: "3 months"},
  { key: "last_6m", label: "6 months" },
  { key: "last_1y", label: "1 year" },
  { key: "all", label: "All time" },
]

export function EquityReturnSection() {
  const { dateRange, setDateRange } = useDashboardDateRange()

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
      <EquityChartSection />
      <ReturnChartSection />
    </div>
  )
}
