"use client"

import * as React from "react"
import { formatISO } from "date-fns"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Enums, Constants } from "@/lib/database.types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { CashFlowForm } from "./cashflow"
import { TradeForm } from "./buy-sell"
import { DividendForm } from "./dividend"
import { BorrowForm } from "./borrow"
import { DebtPaymentForm } from "./debt-payment"
import { SplitForm } from "./split"

type TransactionType = Enums<"transaction_type">

const FORM_COMPONENTS: Record<string, Array<Enums<"transaction_type">>> = {
  cashflow: ["deposit", "withdraw", "income", "expense"],
  trade: ["buy", "sell"],
  dividend: ["dividend"],
  borrow: ["borrow"],
  debt_payment: ["debt_payment"],
  split: ["split"],
}

export function TransactionForm({
  open,
  onOpenChange,
  transactionType: initialTransactionType = "deposit",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionType?: TransactionType
}) {
  const router = useRouter()
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [transactionType, setTransactionType] = React.useState<TransactionType>(initialTransactionType)
  const [formState, setFormState] = React.useState<Record<string, string | undefined>>({})

  const updateFormState = React.useCallback((updates: Record<string, string | undefined>) => {
    setFormState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    updateFormState({ [name]: value })
  }, [updateFormState])

  const handleSelectChange = React.useCallback((name: string) => (value: string) => {
    updateFormState({ [name]: value })
  }, [updateFormState])

  const handlePickerChange = React.useCallback((name: string) => (value: string | undefined) => {
    updateFormState({ [name]: value })
  }, [updateFormState])

  React.useEffect(() => {
    setTransactionType(initialTransactionType)
    setFormState({})
  }, [initialTransactionType])

  const buildRequestBody = React.useCallback(() => {
    const baseBody = {
      transaction_date: formatISO(date!, { representation: "date" }),
      transaction_type: transactionType,
      description: formState.description,
    }

    const parseFloat = (value: string | undefined): number => parseFloat(value || "0")

    switch (transactionType) {
      case "deposit":
      case "withdraw":
      case "income":
      case "expense":
      case "dividend":
        return {
          ...baseBody,
          account: formState.account,
          quantity: parseFloat(formState.quantity),
          asset: formState.asset,
          ...(transactionType === "dividend" && {
            dividend_asset: formState.dividend_asset,
          }),
        }

      case "buy":
      case "sell":
        return {
          ...baseBody,
          account: formState.account,
          asset: formState.asset,
          cash_asset_id: formState.cash_asset_id,
          quantity: parseFloat(formState.quantity),
          price: parseFloat(formState.price),
          fees: parseFloat(formState.fees),
          ...(transactionType === "sell" && {
            taxes: parseFloat(formState.taxes),
          }),
        }

      case "borrow":
        return {
          ...baseBody,
          lender: formState.lender,
          principal: parseFloat(formState.principal),
          interest_rate: parseFloat(formState.interest_rate),
          deposit_account_id: formState.deposit_account_id,
          asset: formState.asset,
        }

      case "debt_payment":
        return {
          ...baseBody,
          debt: formState.debt,
          from_account_id: formState.from_account_id,
          principal_payment: parseFloat(formState.principal_payment),
          interest_payment: parseFloat(formState.interest_payment),
          asset: formState.asset,
        }

      case "split":
        return {
          transaction_date: formatISO(date!, { representation: "date" }),
          transaction_type: "split",
          asset: formState.asset,
          split_quantity: parseFloat(formState.split_quantity),
        }

      default:
        throw new Error(`Transaction type "${transactionType}" is not yet supported.`)
    }
  }, [date, transactionType, formState])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!date) {
      toast.error("Please select a date.")
      return
    }

    setIsSubmitting(true)

    try {
      const body = buildRequestBody()
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.error?.issues) {
          const messages = result.error.issues.map(
            (issue: { path: string[]; message: string }) =>
              `${issue.path.join(".")} is ${issue.message.toLowerCase()}`
          )
          throw new Error(messages.join("; "))
        }
        throw new Error(result.error || "An unknown error occurred.")
      }

      toast.success("Transaction saved successfully!")
      setFormState({})
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred."
      toast.error(`Failed to save transaction: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFormFields = () => {
    const formProps = {
      formState,
      handleInputChange,
      handleSelectChange,
      handlePickerChange,
    }

    // Find which form component to render
    for (const [component, types] of Object.entries(FORM_COMPONENTS)) {
      if (types.includes(transactionType)) {
        switch (component) {
          case "cashflow":
            return <CashFlowForm transactionType={transactionType} {...formProps} />
          case "trade":
            return <TradeForm transactionType={transactionType} {...formProps} />
          case "dividend":
            return <DividendForm {...formProps} />
          case "borrow":
            return <BorrowForm {...formProps} />
          case "debt_payment":
            return <DebtPaymentForm {...formProps} />
          case "split":
            return <SplitForm {...formProps} />
        }
      }
    }
    return null
  }

  const formatTransactionType = (type: string) =>
    type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <div className="flex-auto overflow-y-auto">
          <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 pb-4">
              <div className="grid gap-3">
                <Label htmlFor="date">Date</Label>
                <DatePicker mode="single" selected={date} onSelect={setDate} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="transaction-type">Type</Label>
                <Select
                  onValueChange={value => setTransactionType(value as TransactionType)}
                  defaultValue={transactionType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Constants.public.Enums.transaction_type.map(type => (
                      <SelectItem key={type} value={type}>
                        {formatTransactionType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid col-span-2 gap-3">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  type="text"
                  placeholder="Enter a description..."
                  value={formState.description || ""}
                  onChange={handleInputChange}
                />
              </div>
              {renderFormFields()}
            </div>
            <DialogFooter className="sticky bottom-0 bg-background">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="transaction-form" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}