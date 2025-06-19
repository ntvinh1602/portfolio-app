"use client"

import * as React from "react"
import { format } from "date-fns"
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

type TransactionType = Enums<"transaction_type">

export function TransactionForm({ children }: { children: React.ReactNode }) {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const [accounts, setAccounts] = React.useState<Tables<"accounts">[]>([])
  const [assets, setAssets] = React.useState<Tables<"assets">[]>([])
  const [debts, setDebts] = React.useState<Tables<"debts">[]>([])
  const [transactionType, setTransactionType] =
    React.useState<TransactionType>("deposit")
  const [formState, setFormState] = React.useState<Record<string, any>>({})

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string) => (value: string) => {
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
      if (accountsError) console.error("Error fetching accounts:", accountsError)
      else setAccounts(accountsData || [])

      const { data: assetsData, error: assetsError } = await supabase
        .from("assets")
        .select("*")
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log({
      date,
      transactionType,
      ...formState,
    })
  }

  return (
    <Dialog>
      <form onSubmit={handleSubmit}>
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
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                className="text-sm"
                id="description"
                placeholder="Enter transaction description..."
                name="description"
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
                    <SelectTrigger>
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
                {transactionType === "dividend" && (
                  <div className="grid gap-3 col-span-2">
                    <Label htmlFor="dividend-asset">Asset</Label>
                    <Select
                      name="dividend-asset"
                      onValueChange={handleSelectChange("dividend-asset")}
                      value={formState["dividend-asset"]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {assets
                          .filter(
                            asset =>
                              asset.asset_class === "stock" ||
                              asset.asset_class === "equity",
                          )
                          .map(asset => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.name} ({asset.ticker})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {transactionType === "buy" && (
              <>
                <div className="grid gap-3">
                  <Label htmlFor="buy-account">Account</Label>
                  <Select
                    name="buy-account"
                    onValueChange={handleSelectChange("buy-account")}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="buy-asset">Asset</Label>
                  <Select
                    name="buy-asset"
                    onValueChange={handleSelectChange("buy-asset")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.ticker})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </>
            )}

            {transactionType === "sell" && (
              <>
                <div className="grid gap-3">
                  <Label htmlFor="sell-account">Account</Label>
                  <Select
                    name="sell-account"
                    onValueChange={handleSelectChange("sell-account")}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="sell-asset">Asset</Label>
                  <Select
                    name="sell-asset"
                    onValueChange={handleSelectChange("sell-asset")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map(asset => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.ticker})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="sell-quantity">Quantity</Label>
                  <Input
                    id="sell-quantity"
                    name="sell-quantity"
                    type="number"
                    placeholder="0"
                    value={formState["sell-quantity"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="sell-price">Price</Label>
                  <Input
                    id="sell-price"
                    name="sell-price"
                    type="number"
                    placeholder="0.00"
                    value={formState["sell-price"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="sell-fees">Fees</Label>
                  <Input
                    id="sell-fees"
                    name="sell-fees"
                    type="number"
                    placeholder="0.00"
                    value={formState["sell-fees"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
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
                    <SelectTrigger>
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
              </>
            )}

            {transactionType === "debt_payment" && (
              <>
                <div className="grid gap-3 col-span-2">
                  <Label htmlFor="debt">Debt</Label>
                  <Select
                    name="debt"
                    onValueChange={handleSelectChange("debt")}
                    value={formState.debt}
                  >
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                <div className="grid gap-3">
                  <Label htmlFor="split-account">Account</Label>
                  <Select
                    name="split-account"
                    onValueChange={handleSelectChange("split-account")}
                    value={formState["split-account"]}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="split-asset">Asset</Label>
                  <Select
                    name="split-asset"
                    onValueChange={handleSelectChange("split-asset")}
                    value={formState["split-asset"]}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assets
                        .filter(asset => asset.asset_class === "stock")
                        .map(asset => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.name} ({asset.ticker})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3">
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
                <div className="grid gap-3">
                  <Label htmlFor="split-tax">Tax Paid (Cost Basis)</Label>
                  <Input
                    id="split-tax"
                    name="split-tax"
                    type="number"
                    placeholder="0.00"
                    value={formState["split-tax"] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            )}
            {/* --- Dynamic Fields End --- */}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
