"use client"

import * as React from "react"
import { format, formatISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { supabase } from "@/lib/supabase/supabaseClient"
import { Tables, Enums } from "@/lib/database.types"
import { Constants } from "@/lib/database.types"
import { Combobox } from "@/components/combobox"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type TransactionType = Enums<"transaction_type">

export function TransactionForm({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [accounts, setAccounts] = React.useState<Tables<"accounts">[]>([])
  const [assets, setAssets] = React.useState<Tables<"assets">[]>([])
  const [debts, setDebts] = React.useState<Tables<"debts">[]>([])
  const [transactionType, setTransactionType] =
    React.useState<TransactionType>("deposit")
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

  const handlePickerChange = (name: string) => (value: string | undefined) => {
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  React.useEffect(() => {
    // Reset form state when transaction type changes
    setFormState({})
  }, [transactionType])

  React.useEffect(() => {
    const fetchInitialData = async () => {
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .not("type", "eq", "conceptual")
      if (accountsError) console.error("Error fetching accounts:", accountsError)
      else setAccounts(accountsData || [])

      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("*")
        .not("asset_class", "in", "(equity,liability)")
      if (assetsError) console.error("Error fetching assets:", assetsError)
      else setAssets(assetsData || [])

      const { data: debtsData, error: debtsError } = await supabase
        .from("debts")
        .select("*")
        .eq("status", "active")
      if (debtsError) console.error("Error fetching debts:", debtsError)
      else setDebts(debtsData || [])
    }

    fetchInitialData()
  }, [])

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
        const errorMessage =
          result.error?.issues?.[0]?.message ||
          result.error ||
          "An unknown error occurred."
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

  return (
    <Dialog>
      <form id="transaction-form" onSubmit={handleSubmit}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Date</Label>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, "dd/MM/yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    onSelect={selectedDate => {
                      setDate(selectedDate)
                      setIsPopoverOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

            {/* --- Dynamic Fields Start --- */}
            {[
              "deposit",
              "withdraw",
              "expense",
              "income",
              "dividend",
            ].includes(transactionType) && (
              <>
                <div className="grid gap-3">
                  <Label htmlFor="account">
                    {[ "deposit", "income", "dividend" ].includes(transactionType)
                      ? "To Account"
                      : "From Account"}
                  </Label>
                  <Select
                    name="account"
                    onValueChange={handleSelectChange("account")}
                    value={formState.account}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="asset">Asset</Label>
                  <Select
                    name="asset"
                    onValueChange={handleSelectChange("asset")}
                    value={formState.asset}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets
                        .filter(asset =>
                          asset.asset_class === "cash" ||
                          asset.asset_class === "epf",
                        )
                        .map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="0.00"
                    value={formState.amount || ""}
                    onChange={handleInputChange}
                  />
                </div>
                {["deposit", "withdraw", "dividend"].includes(
                  transactionType,
                ) && (
                  <div className="grid gap-3">
                    <Label htmlFor="quantity">Quantity (optional)</Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      placeholder="0.00"
                      value={formState.quantity || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
                {transactionType === "dividend" && (
                  <div className="grid gap-3 col-span-2">
                    <Label htmlFor="dividend-asset">Asset</Label>
                    <Combobox
                      items={assets
                        .filter(
                          asset =>
                            asset.asset_class === "stock" ||
                            asset.asset_class === "epf",
                        )
                        .map(asset => ({
                          value: asset.id,
                          label: `${asset.ticker} - ${asset.name}`,
                        }))}
                      value={formState["dividend-asset"]}
                      onChange={handlePickerChange("dividend-asset")}
                      placeholder="Select asset..."
                      searchPlaceholder="Search assets..."
                      emptyPlaceholder="No assets found."
                    />
                  </div>
                )}
              </>
            )}

            {[
              "buy",
              "sell"
            ].includes(transactionType) && (
              <>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="account">Account</Label>
                  <Select
                    name="account"
                    onValueChange={handleSelectChange("account")}
                    value={formState.account}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="cash_asset_id">Cash Asset</Label>
                  <Select
                    name="cash_asset_id"
                    onValueChange={handleSelectChange("cash_asset_id")}
                    value={formState.cash_asset_id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select cash asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets
                        .filter(asset => asset.asset_class === "cash")
                        .map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="asset">Asset</Label>
                  <Combobox
                    items={assets
                      .filter(asset => asset.asset_class === "stock")
                      .map(asset => ({
                        value: asset.id,
                        label: `${asset.ticker} - ${asset.name}`,
                      }))}
                    value={formState.asset}
                    onChange={handlePickerChange("asset")}
                    placeholder="Select asset..."
                    searchPlaceholder="Search assets..."
                    emptyPlaceholder="No assets found."
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    placeholder="0"
                    value={formState.quantity || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    placeholder="0.00"
                    value={formState.price || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="fees">Fees</Label>
                  <Input
                    id="fees"
                    name="fees"
                    type="number"
                    placeholder="0.00"
                    value={formState.fees || ""}
                    onChange={handleInputChange}
                  />
                </div>
                {transactionType === "sell" && (
                  <div className="grid gap-3 col-span-2">
                    <Label htmlFor="taxes">Taxes</Label>
                    <Input
                      id="taxes"
                      name="taxes"
                      type="number"
                      placeholder="0.00"
                      value={formState.taxes || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </>
            )}

            {transactionType === "borrow" && (
              <>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="lender">Lender Name</Label>
                  <Input
                    id="lender"
                    name="lender"
                    placeholder="Enter lender name..."
                    value={formState.lender || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="principal">Principal Amount</Label>
                  <Input
                    id="principal"
                    name="principal"
                    type="number"
                    placeholder="0.00"
                    value={formState.principal || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                  <Input
                    id="interest-rate"
                    name="interest-rate"
                    type="number"
                    placeholder="0.0"
                    value={formState["interest-rate"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="deposit-account">Deposit Account</Label>
                  <Select
                    name="deposit-account"
                    onValueChange={handleSelectChange("deposit-account")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="asset">Cash Asset</Label>
                  <Select
                    name="asset"
                    onValueChange={handleSelectChange("asset")}
                    value={formState.asset}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select cash asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets
                        .filter(asset => asset.asset_class === "cash")
                        .map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {transactionType === "debt_payment" && (
              <>
                <div className="grid gap-3">
                  <Label htmlFor="debt">Debt</Label>
                  <Select
                    name="debt"
                    onValueChange={handleSelectChange("debt")}
                    value={formState.debt}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select debt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {debts.map(debt => (
                        <SelectItem key={debt.id} value={debt.id}>
                          {debt.lender_name} ({debt.principal_amount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="from-account">From Account</Label>
                  <Select
                    name="from-account"
                    onValueChange={handleSelectChange("from-account")}
                    value={formState["from-account"]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="asset">Cash Asset</Label>
                  <Select
                    name="asset"
                    onValueChange={handleSelectChange("asset")}
                    value={formState.asset}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select cash asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets
                        .filter(asset => asset.asset_class === "cash")
                        .map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="principal-payment">Principal</Label>
                  <Input
                    id="principal-payment"
                    name="principal-payment"
                    type="number"
                    placeholder="0.00"
                    value={formState["principal-payment"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="interest-payment">Interest</Label>
                  <Input
                    id="interest-payment"
                    name="interest-payment"
                    type="number"
                    placeholder="0.00"
                    value={formState["interest-payment"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}

            {transactionType === "split" && (
              <>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="asset">Asset</Label>
                  <Combobox
                    items={assets
                      .filter(asset => asset.asset_class === "stock")
                      .map(asset => ({
                        value: asset.id,
                        label: `${asset.ticker} - ${asset.name}`,
                      }))}
                    value={formState.asset}
                    onChange={handlePickerChange("asset")}
                    placeholder="Select asset..."
                    searchPlaceholder="Search assets..."
                    emptyPlaceholder="No assets found."
                  />
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="split-quantity">New Shares Quantity</Label>
                  <Input
                    id="split-quantity"
                    name="split-quantity"
                    type="number"
                    placeholder="0"
                    value={formState["split-quantity"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            {/* --- Dynamic Fields End --- */}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" id="close-dialog">Cancel</Button>
            </DialogClose>
            <Button type="submit" form="transaction-form" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
