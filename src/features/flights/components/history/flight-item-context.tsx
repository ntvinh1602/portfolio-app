"use client"

import { createContext, useState, use } from "react"

type OpenKey = string | null

interface FlightItemContextValue {
  state: {
    openKey: OpenKey
  }
  actions: {
    setOpenKey: (key: OpenKey) => void
  }
}

const FlightItemContext = createContext<FlightItemContextValue | null>(null)

export function FlightItemProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [openKey, setOpenKey] = useState<OpenKey>(null)

  return (
    <FlightItemContext.Provider
      value={{
        state: { openKey },
        actions: { setOpenKey },
      }}
    >
      {children}
    </FlightItemContext.Provider>
  )
}

export function useFlightItem() {
  const ctx = use(FlightItemContext)
  if (!ctx) {
    throw new Error("useFlightItem must be used within FlightItemProvider")
  }
  return ctx
}
