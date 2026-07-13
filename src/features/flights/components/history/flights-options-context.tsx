"use client"

import { createContext, use, useMemo } from "react"

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
  airlineFilterOptions,
  startYear,
  airlineFormOptions,
  aircraftFormOptions,
  airportFormOptions,
}: FlightsOptionsContextValue & { children: React.ReactNode }) {
  const value = useMemo<FlightsOptionsContextValue>(
    () => ({
      airlineFilterOptions,
      startYear,
      airlineFormOptions,
      aircraftFormOptions,
      airportFormOptions,
    }),
    [
      airlineFilterOptions,
      startYear,
      airlineFormOptions,
      aircraftFormOptions,
      airportFormOptions,
    ],
  )

  return (
    <FlightsOptionsContext.Provider value={value}>
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
