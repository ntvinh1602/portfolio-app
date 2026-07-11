"use client"

import { createContext, useState, use } from "react"

interface PerformanceYearContextValue {
  year: number | null
  setYear: React.Dispatch<React.SetStateAction<number | null>>
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
  const [year, setYear] = useState<number | null>(() => new Date().getFullYear())

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
