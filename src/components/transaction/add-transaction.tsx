"use client"

import * as React from "react"
import { formatISO } from "date-fns"
import DatePicker from "@/components/date-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { CashFlowForm } from "./forms/CashFlowForm"
import { TradeForm } from "./forms/TradeForm"
import { DividendForm } from "./forms/DividendForm"
import { BorrowForm } from "./forms/BorrowForm"
import { DebtPaymentForm } from "./forms/DebtPaymentForm"
import { SplitForm } from "./forms/SplitForm"

type TransactionType = Enums<"transaction_type">

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
  const [transactionType, setTransactionType] =
    React.useState<TransactionType>(initialTransactionType)
  const [formState, setFormState] = React.useState<
    Record<string, string | undefined>
  >({})

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handlePickerChange =
    (name: string) => (value: string | undefined) => {
      setFormState(prev => ({ ...prev, [name]: value }))
    }

  React.useEffect(() => {
    setTransactionType(initialTransactionType)
    setFormState({})
  }, [initialTransactionType])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!date) {
      toast.error("Please select a date.")
      return
    }
    setIsSubmitting(true)

    let body

    try {
      const baseBody = {
        transaction_date: formatISO(date, { representation: "date" }),
        transaction_type: transactionType,
        description: formState.description,
      }

      switch (transactionType) {
        case "deposit":
        case "withdraw":
          body = {
            ...baseBody,
            account: formState.account,
            amount: parseFloat(formState.amount || "0"),
            quantity: formState.quantity
              ? parseFloat(formState.quantity)
              : undefined,
            asset: formState.asset,
          }
          break
        case "income":
        case "expense":
          body = {
            ...baseBody,
            account: formState.account,
            amount: parseFloat(formState.amount || "0"),
            asset: formState.asset,
          }
          break
        case "dividend":
          body = {
            ...baseBody,
            account: formState.account,
            amount: parseFloat(formState.amount || "0"),
            quantity: formState.quantity
              ? parseFloat(formState.quantity)
              : undefined,
            "dividend-asset": formState["dividend-asset"],
            asset: formState.asset, // This is the cash asset
          }
          break
        case "buy":
        case "sell":
          body = {
            ...baseBody,
            account: formState.account,
            asset: formState.asset,
            cash_asset_id: formState.cash_asset_id,
            quantity: parseFloat(formState.quantity || "0"),
            price: parseFloat(formState.price || "0"),
            fees: parseFloat(formState.fees || "0"),
            ...(transactionType === "sell" && {
              taxes: parseFloat(formState.taxes || "0"),
            }),
          }
          break
        case "borrow":
          body = {
            ...baseBody,
            lender: formState.lender,
            principal: parseFloat(formState.principal || "0"),
            "interest-rate": parseFloat(formState["interest-rate"] || "0"),
            "deposit-account": formState["deposit-account"],
            asset: formState.asset,
          }
          break
        case "debt_payment":
          body = {
            ...baseBody,
            debt: formState.debt,
            "from-account": formState["from-account"],
            "principal-payment": parseFloat(
              formState["principal-payment"] || "0",
            ),
            "interest-payment": parseFloat(
              formState["interest-payment"] || "0",
            ),
            asset: formState.asset,
          }
          break
        case "split":
          body = {
            transaction_date: formatISO(date, { representation: "date" }),
            transaction_type: "split",
            asset: formState.asset,
            "split-quantity": parseFloat(formState["split-quantity"] || "0"),
          }
          break
        default:
          toast.error(
            `Transaction type "${transactionType}" is not yet supported.`,
          )
          setIsSubmitting(false)
          return
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.error?.issues) {
          const issues = result.error.issues
          const messages = issues.map(
            (issue: { path: string[]; message: string }) =>
              `${issue.path.join(".")} is ${issue.message.toLowerCase()}`,
          )
          throw new Error(messages.join("; "))
        }
        const errorMessage = result.error || "An unknown error occurred."
        throw new Error(errorMessage)
      }

      toast.success("Transaction saved successfully!")
      setFormState({})
      document.getElementById("close-dialog")?.click()
      router.refresh()
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Failed to save transaction: ${error.message}`)
      } else {
        toast.error("An unexpected error occurred.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFormFields = () => {
    const cashFlowTypes: TransactionType[] = [
      "deposit",
      "withdraw",
      "income",
      "expense",
    ]
    const tradeTypes: TransactionType[] = ["buy", "sell"]

    if (cashFlowTypes.includes(transactionType)) {
      return (
        <CashFlowForm
          transactionType={transactionType}
          formState={formState}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
        />
      )
    }
    if (tradeTypes.includes(transactionType)) {
      return (
        <TradeForm
          transactionType={transactionType}
          formState={formState}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
          handlePickerChange={handlePickerChange}
        />
      )
    }
    if (transactionType === "dividend") {
      return (
        <DividendForm
          formState={formState}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
          handlePickerChange={handlePickerChange}
        />
      )
    }
    if (transactionType === "borrow") {
      return (
        <BorrowForm
          formState={formState}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
        />
      )
    }
    if (transactionType === "debt_payment") {
      return (
        <DebtPaymentForm
          formState={formState}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
        />
      )
    }
    if (transactionType === "split") {
      return (
        <SplitForm
          formState={formState}
          handleInputChange={handleInputChange}
          handlePickerChange={handlePickerChange}
        />
      )
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form id="transaction-form" onSubmit={handleSubmit}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Date</Label>
              <DatePicker
                mode="single"
                selected={date}
                onSelect={setDate}
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="transaction-type">Type</Label>
              <Select
                onValueChange={value =>
                  setTransactionType(value as TransactionType)
                }
                defaultValue={transactionType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {Constants.public.Enums.transaction_type.map(type => (
                    <SelectItem key={type} value={type}>
                      {type
                        .split("_")
                        .map(
                          word => word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ")}
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" id="close-dialog">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="transaction-form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
