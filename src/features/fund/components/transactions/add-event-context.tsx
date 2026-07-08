"use client"

import { createContext, useState, use } from "react"
import type { Enums } from "@/types/database.types"
import { StockForm } from "@fund/form/stockForm"
import { CashflowForm } from "@fund/form/cashflowForm"
import { BorrowForm } from "@fund/form/borrowForm"
import { RepayForm } from "@fund/form/repayForm"

export type TransactionFormType = Enums<"tx_category">

export const formConfig: Record<
  TransactionFormType,
  {
    title: string
    subtitle?: string
    Component: React.ComponentType<{
      onSuccess?: () => void
      formId: string
      onLoadingChange: (loading: boolean) => void
      resetFormRef: { current: () => void }
    }>
  }
> = {
  stock: {
    title: "Add Stock Trades",
    subtitle: "Record sales or acquisition of stocks",
    Component: StockForm,
  },
  cashflow: {
    title: "Add Cashflow Events",
    subtitle: "Record cash assets transactions",
    Component: CashflowForm,
  },
  borrow: {
    title: "Add Debts",
    subtitle: "Record a new debt",
    Component: BorrowForm,
  },
  repay: {
    title: "Add Repayment",
    subtitle: "Record a debt settlement",
    Component: RepayForm,
  },
}

type AddEventFormConfig = (typeof formConfig)[TransactionFormType]

interface AddEventContextValue {
  state: {
    open: boolean
    activeForm: TransactionFormType | null
    currentConfig: AddEventFormConfig | null
  }
  actions: {
    setOpen: (open: boolean) => void
    openForm: (type: TransactionFormType) => void
  }
}

const AddEventContext = createContext<AddEventContextValue | null>(null)

export function AddEventProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [activeForm, setActiveForm] = useState<TransactionFormType | null>(null)

  const openForm = (type: TransactionFormType) => {
    setActiveForm(type)
    setOpen(true)
  }

  const currentConfig = activeForm ? formConfig[activeForm] : null

  return (
    <AddEventContext.Provider
      value={{
        state: {
          open,
          activeForm,
          currentConfig,
        },
        actions: {
          setOpen,
          openForm,
        },
      }}
    >
      {children}
    </AddEventContext.Provider>
  )
}

export function useAddEvent() {
  const ctx = use(AddEventContext)
  if (!ctx) {
    throw new Error("useAddEvent must be used within AddEventProvider")
  }
  return ctx
}
