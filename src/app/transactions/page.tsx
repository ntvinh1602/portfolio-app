"use client"

import { useState } from "react"
import { subMonths } from "date-fns"
import { DatePicker } from "@/components/date-picker"
import { Header } from "@/components/header"
import { DataTable } from "./table/data-table"
import { columns } from "./table/columns"
import { useTransactions } from "@/hooks/useTransactions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
  RepayForm
} from "./form/index"
import { FormDialogWrapper } from "@/components/form/dialog-form-wrapper"
import { Separator } from "@/components/ui/separator"

type Preset = "1M" | "3M" | "6M" | "1Y" | "CUSTOM"
type TransactionFormType = "stock" | "cashflow" | "borrow" | "repay"

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
  const [preset, setPreset] = useState<Preset>("3M")
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 1),
    endDate: new Date(),
  })

  const { data, error } = useTransactions(dateRange)

  // Handle preset change
  const handlePresetChange = (value: Preset) => {
    setPreset(value)
    if (value === "1M") {
      setDateRange({
        startDate: subMonths(new Date(), 1),
        endDate: new Date(),
      })
    } else if (value === "3M") {
      setDateRange({
        startDate: subMonths(new Date(), 3),
        endDate: new Date(),
      })
    } else if (value === "6M") {
      setDateRange({
        startDate: subMonths(new Date(), 6),
        endDate: new Date(),
      })
    } else if (value === "1Y") {
      setDateRange({
        startDate: subMonths(new Date(), 12),
        endDate: new Date(),
      })
    }
  }
  const [open, setOpen] = useState(false)
  const [activeForm, setActiveForm] =
    useState<TransactionFormType | null>(null)

  const handleOpenForm = (type: TransactionFormType) => {
    setActiveForm(type)
    setOpen(true)
  }

  const currentConfig = activeForm ? formConfig[activeForm] : null

  return (
    <div className="flex flex-col h-svh overflow-hidden">
      <Header title="Transactions" />
      <Separator/>
      <div className="flex flex-col flex-1 min-h-0 w-8/10 mt-4 mx-auto gap-2">
        {error && (
          <div className="text-red-500 text-sm">
            Error fetching transactions: {error.message}
          </div>
        )}

        <DataTable columns={columns} data={data ?? []}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PlusIcon/>Transaction
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
          <div className="flex items-center gap-2">
            <Select
              value={preset}
              onValueChange={(v) => handlePresetChange(v as Preset)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">Last 1 months</SelectItem>
                <SelectItem value="3M">Last 3 months</SelectItem>
                <SelectItem value="6M">Last 6 months</SelectItem>
                <SelectItem value="1Y">Last 1 year</SelectItem>
                <SelectItem value="CUSTOM">Custom...</SelectItem>
              </SelectContent>
            </Select>

            {preset === "CUSTOM" && (
              <DatePicker
                dateFrom={dateRange.startDate}
                dateTo={dateRange.endDate}
                onDateFromChange={(date) =>
                  setDateRange((prev) => ({ ...prev, startDate: date }))
                }
                onDateToChange={(date) =>
                  setDateRange((prev) => ({ ...prev, endDate: date }))
                }
              />
            )}
          </div>
        </DataTable>
      </div>
    </div>
  )
}
