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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"
import { Enums, Constants } from "@/lib/database.types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { CashFlowForm } from "./cashflow"
import { TradeForm } from "./buy-sell"
import { DividendForm } from "./dividend"
import { BorrowForm } from "./borrow"
import { DebtPaymentForm } from "./debt-payment"
import { SplitForm } from "./split"
import { cn } from "@/lib/utils"

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
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Transaction</DrawerTitle>
          </DrawerHeader>
          <AddTransactionForm
            className="px-6 pb-40"
            initialTransactionType={initialTransactionType}
            onClose={() => onOpenChange(false)}
          />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <AddTransactionForm
          initialTransactionType={initialTransactionType}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

interface AddTransactionFormProps {
  className?: string
  initialTransactionType: TransactionType
  onClose: () => void
}

function AddTransactionForm({
  className,
  initialTransactionType,
  onClose,
}: AddTransactionFormProps) {
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
        case "income":
        case "expense":
        case "dividend":
          body = {
            ...baseBody,
            account: formState.account,
            quantity: parseFloat(formState.quantity || "0"),
            asset: formState.asset,
            ...(transactionType === "dividend" && {
              dividend_asset: formState.dividend_asset,
            }),
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
            interest_rate: parseFloat(formState.interest_rate || "0"),
            deposit_account_id: formState.deposit_account_id,
            asset: formState.asset,
          }
          break
        case "debt_payment":
          body = {
            ...baseBody,
            debt: formState.debt,
            from_account_id: formState.from_account_id,
            principal_payment: parseFloat(
              formState.principal_payment || "0",
            ),
            interest_payment: parseFloat(
              formState.interest_payment || "0",
            ),
            asset: formState.asset,
          }
          break
        case "split":
          body = {
            transaction_date: formatISO(date, { representation: "date" }),
            transaction_type: "split",
            asset: formState.asset,
            split_quantity: parseFloat(formState.split_quantity || "0"),
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
      onClose()
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

  const isMobile = useIsMobile()
  const Footer = isMobile ? DrawerFooter : DialogFooter

  return (
    <form
      id="transaction-form"
      onSubmit={handleSubmit}
      className={cn("space-y-4", className)}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-3">
          <Label htmlFor="date">Date</Label>
          <DatePicker mode="single" selected={date} onSelect={setDate} />
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
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
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
      <Footer>
        <DrawerClose asChild>
          <Button variant="outline">
            Cancel
          </Button>
        </DrawerClose>
        <Button
          type="submit"
          form="transaction-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </Footer>
    </form>
  )
}
