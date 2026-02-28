"use client"

import { useState, useMemo } from "react"
import { subMonths } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { DataTable } from "./table/data-table"
import { columns } from "./table/columns"
import { useTransactions } from "@/hooks/useTransactions"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import {
  StockForm,
  CashflowForm,
  BorrowForm,
  RepayForm,
} from "./form"

import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import { Separator } from "@/components/ui/separator"

type Preset = "1M" | "3M" | "6M" | "1Y" | "CUSTOM"
type TransactionFormType = "stock" | "cashflow" | "borrow" | "repay"

function getDateRangeFromPreset(preset: Preset) {
  const now = new Date()

  switch (preset) {
    case "1M":
      return { startDate: subMonths(now, 1), endDate: now }
    case "3M":
      return { startDate: subMonths(now, 3), endDate: now }
    case "6M":
      return { startDate: subMonths(now, 6), endDate: now }
    case "1Y":
      return { startDate: subMonths(now, 12), endDate: now }
    default:
      return { startDate: subMonths(now, 3), endDate: now }
  }
}

const formConfig: Record<
  TransactionFormType,
  { title: string; subtitle?: string; Component: React.ComponentType }
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

export default function TransactionsPage() {
  const defaultPreset: Preset = "3M"

  const [preset, setPreset] = useState<Preset>(defaultPreset)

  const [customRange, setCustomRange] = useState(
    getDateRangeFromPreset(defaultPreset)
  )

  const dateRange = useMemo(() => {
    if (preset === "CUSTOM") return customRange
    return getDateRangeFromPreset(preset)
  }, [preset, customRange])

  const { data, error, isLoading } = useTransactions(dateRange)

  const [open, setOpen] = useState(false)
  const [activeForm, setActiveForm] =
    useState<TransactionFormType | null>(null)

  const handleOpenForm = (type: TransactionFormType) => {
    setActiveForm(type)
    setOpen(true)
  }

  const currentConfig = activeForm ? formConfig[activeForm] : null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Separator />

      <div className="flex flex-col flex-1 min-h-0 w-8/10 mt-4 mx-auto gap-4">

        {error && (
          <div className="text-sm text-red-500">
            Error fetching transactions: {error.message}
          </div>
        )}

        <DataTable columns={columns} data={data} >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusIcon />
                Transaction
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={() => handleOpenForm("stock")}>
                Stock Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenForm("cashflow")}>
                Cashflow Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenForm("borrow")}>
                Borrow Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenForm("repay")}>
                Repay Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {currentConfig && (
            <FormDialogWrapper
              open={open}
              onOpenChange={(value) => {
                setOpen(value)
                if (!value) setActiveForm(null)
              }}
              title={currentConfig.title}
              subtitle={currentConfig.subtitle}
              FormComponent={currentConfig.Component}
            />
          )}

          <div className="flex items-center gap-3">
            <Select
              value={preset}
              onValueChange={(value) => setPreset(value as Preset)}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">Last 1 month</SelectItem>
                <SelectItem value="3M">Last 3 months</SelectItem>
                <SelectItem value="6M">Last 6 months</SelectItem>
                <SelectItem value="1Y">Last 1 year</SelectItem>
                <SelectItem value="CUSTOM">Custom...</SelectItem>
              </SelectContent>
            </Select>

            {preset === "CUSTOM" && (
              <DatePicker
                dateFrom={customRange.startDate}
                dateTo={customRange.endDate}
                onDateFromChange={(date) =>
                  setCustomRange((prev) => ({
                    ...prev,
                    startDate: date ?? prev.startDate,
                  }))
                }
                onDateToChange={(date) =>
                  setCustomRange((prev) => ({
                    ...prev,
                    endDate: date ?? prev.endDate,
                  }))
                }
              />
            )}
          </div>
        </DataTable>
      </div>
    </div>
  )
}