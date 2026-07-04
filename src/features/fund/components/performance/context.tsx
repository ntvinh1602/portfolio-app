"use client"

import { createContext, useState, use } from "react"

interface PerformanceYearContextValue {
  year: number
  setYear: (year: number) => void
  startYear: number
}

const PerformanceYearContext = createContext<PerformanceYearContextValue | null>(
  null,
)

export function PerformanceYearProvider({
  startYear,
  children,
}: {
  startYear: number
  children: React.ReactNode
}) {
  const [year, setYear] = useState<number>(() => new Date().getFullYear())

  return (
    <PerformanceYearContext.Provider value={{ year, setYear, startYear }}>
      {children}
    </PerformanceYearContext.Provider>
  )
}

export function usePerformanceYear() {
  const ctx = use(PerformanceYearContext)
  if (!ctx) throw new Error("usePerformanceYear must be used within PerformanceYearProvider")
  return ctx
}
