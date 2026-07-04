"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface PerformanceYearContextValue {
  year: number | null
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
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  return (
    <PerformanceYearContext.Provider value={{ year, setYear, startYear }}>
      {children}
    </PerformanceYearContext.Provider>
  )
}

export function usePerformanceYear() {
  const ctx = useContext(PerformanceYearContext)
  if (!ctx) throw new Error("usePerformanceYear must be used within PerformanceYearProvider")
  return ctx
}
