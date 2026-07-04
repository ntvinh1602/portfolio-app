"use client"

import { createContext, useState, use } from "react"

const DASHBOARD_DEFAULT_RANGE = "last_1y"

interface DashboardDateRangeContextValue {
  dateRange: string
  setDateRange: (range: string) => void
}

const DashboardDateRangeContext =
  createContext<DashboardDateRangeContextValue | null>(null)

export function DashboardDateRangeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [dateRange, setDateRange] = useState<string>(
    () => DASHBOARD_DEFAULT_RANGE,
  )

  return (
    <DashboardDateRangeContext.Provider value={{ dateRange, setDateRange }}>
      {children}
    </DashboardDateRangeContext.Provider>
  )
}

export function useDashboardDateRange() {
  const ctx = use(DashboardDateRangeContext)
  if (!ctx)
    throw new Error(
      "useDashboardDateRange must be used within DashboardDateRangeProvider",
    )
  return ctx
}
