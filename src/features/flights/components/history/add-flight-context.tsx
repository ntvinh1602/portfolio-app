"use client"

import { createContext, useState, use } from "react"

interface AddFlightContextValue {
  state: {
    open: boolean
  }
  actions: {
    setOpen: (open: boolean) => void
  }
}

const AddFlightContext = createContext<AddFlightContextValue | null>(null)

export function AddFlightProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <AddFlightContext.Provider
      value={{
        state: { open },
        actions: { setOpen },
      }}
    >
      {children}
    </AddFlightContext.Provider>
  )
}

export function useAddFlight() {
  const ctx = use(AddFlightContext)
  if (!ctx) {
    throw new Error("useAddFlight must be used within AddFlightProvider")
  }
  return ctx
}
