"use client"

import { createContext, use } from "react"

interface FlightsOptionsContextValue {
  airlineFilterOptions: { label: string; value: string }[]
  startYear: number
  airlineFormOptions: { label: string; value: string }[]
  aircraftFormOptions: { label: string; value: string }[]
  airportFormOptions: { label: string; value: string }[]
}

const FlightsOptionsContext =
  createContext<FlightsOptionsContextValue | null>(null)

export function FlightsOptionsProvider({
  children,
  ...options
}: FlightsOptionsContextValue & { children: React.ReactNode }) {
  return (
    <FlightsOptionsContext.Provider value={options}>
      {children}
    </FlightsOptionsContext.Provider>
  )
}

export function useFlightsOptions() {
  const ctx = use(FlightsOptionsContext)
  if (!ctx) {
    throw new Error(
      "useFlightsOptions must be used within FlightsOptionsProvider",
    )
  }
  return ctx
}
