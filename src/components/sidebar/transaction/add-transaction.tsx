"use client"

import * as React from "react"
import { formatISO } from "date-fns"
import { SingleDate } from "@/components/date-picker"
import { Button } from "@/components/ui/button"
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
import { Enums, Constants } from "@/types/database.types"
import { formatNumberWithCommas, parseFormattedNumber } from "@/lib/utils"
import { useAccountData } from "@/hooks/useAccountData"
import { toast } from "sonner"
import { CashFlowForm } from "./cashflow"
import { TradeForm } from "./buy-sell"
import { DividendForm } from "./dividend"
import { BorrowForm } from "./borrow"
import { DebtPaymentForm } from "./debt-payment"
import { SplitForm } from "./split"
import { mutate } from "swr"
import { Loading } from "@/components/loader"

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
  defaultType = "deposit",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultType?: Enums<"transaction_type">
}) {
  const { loading } = useAccountData()
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [transactionType, setTransactionType] =
    React.useState<Enums<"transaction_type">>(defaultType)
  const [formState, setFormState] =
    React.useState<Record<string, string | undefined>>({})

  const updateFormState = React.useCallback((updates: Record<string, string | undefined>) => {
    setFormState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target
      const numericFields = [
        "quantity",
        "price",
        "principal",
        "interest_rate",
        "principal_payment",
        "interest_payment",
        "split_quantity",
      ]

      if (numericFields.includes(name)) {
        updateFormState({ [name]: formatNumberWithCommas(value) })
      } else {
        updateFormState({ [name]: value })
      }
    },
    [updateFormState],
  )

  const handleSelectChange = React.useCallback((name: string) => (value: string) => {
    updateFormState({ [name]: value })
  }, [updateFormState])

  const handlePickerChange = React.useCallback((name: string) => (value: string | undefined) => {
    updateFormState({ [name]: value })
  }, [updateFormState])

  React.useEffect(() => {
    setTransactionType(defaultType)
    setFormState({ asset: "" })
  }, [defaultType])

  const buildRequestBody = React.useCallback(() => {
    const baseBody = {
      transaction_date: formatISO(date!, { representation: "date" }),
      transaction_type: transactionType,
    }

    const parseFloat = (value: string | undefined): number =>
      global.parseFloat(parseFormattedNumber(value || "0"))

    switch (transactionType) {
      case "deposit":
      case "withdraw":
        return {
          ...baseBody,
          quantity: parseFloat(formState.quantity),
          asset: formState.asset
        }
      case "income":
      case "expense":
        return {
          ...baseBody,
          description: formState.description,
          quantity: parseFloat(formState.quantity),
          asset: formState.asset
        }
      case "dividend":
        return {
          ...baseBody,
          quantity: parseFloat(formState.quantity),
          asset: formState.asset,
          dividend_asset: formState.dividend_asset
        }

      case "buy":
      case "sell":
        return {
          ...baseBody,
          cash_asset_id: formState.cash_asset_id,
          asset: formState.asset,
          quantity: parseFloat(formState.quantity),
          price: parseFloat(formState.price),
        }

      case "borrow":
        return {
          ...baseBody,
          lender: formState.lender,
          asset: formState.asset,
          principal: parseFloat(formState.principal),
          interest_rate: parseFloat(formState.interest_rate),
        }

      case "debt_payment":
        return {
          ...baseBody,
          debt: formState.debt,
          asset: formState.asset,
          principal_payment: parseFloat(formState.principal_payment),
          interest_payment: parseFloat(formState.interest_payment),
        }

      case "split":
        return {
          ...baseBody,
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
      const response = await fetch("/api/database/add-transaction", {
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

      // Clear form, close modal
      setFormState({})
      onOpenChange(false)

      // ✅ Tell SWR to refetch dashboard data
      await mutate("/api/gateway/dashboard")
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent
          className="flex flex-col max-h-[95vh]"
          showCloseButton={false}
       >
         <DialogHeader>
           <DialogTitle>Add Transaction</DialogTitle>
         </DialogHeader>
         <div className="flex-auto overflow-y-auto">
           <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-2 gap-4 pb-4">
               <div className="grid gap-3">
                 <Label htmlFor="date">Date</Label>
                 <SingleDate selected={date} onSelect={setDate} />
               </div>
               <div className="grid gap-3">
                 <Label htmlFor="transaction-type">Type</Label>
                 <Select
                   onValueChange={value => setTransactionType(value as Enums<"transaction_type">)}
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
               {loading ?
                  <div className="col-span-2 flex justify-center items-center h-24">
                    <Loading/>
                  </div>
                : renderFormFields()
               }
             </div>
            <DialogFooter className="sticky bottom-0 bg-card/0">
              <Button 
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="transaction-form"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}