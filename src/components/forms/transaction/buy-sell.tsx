"use client"

import * as React from "react"
import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTransactionFormData } from "@/hooks/useTransactionFormData"
import { Combobox } from "@/components/combobox"
import { Enums } from "@/lib/database.types"
import { formatNum } from "@/lib/utils"

type TradeFormProps = {
  transactionType: Enums<"transaction_type">
  formState: Record<string, string | undefined>
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSelectChange: (name: string) => (value: string) => void
  handlePickerChange: (name: string) => (value: string | undefined) => void
}

export function TradeForm({
  transactionType,
  formState,
  handleInputChange,
  handleSelectChange,
  handlePickerChange,
}: TradeFormProps) {
  const { accounts, assets, loading } = useTransactionFormData()

  const { estimatedProceeds, estimatedFee, estimatedTaxes } = useMemo(() => {
    const quantity = parseFloat((formState.quantity || "0").replace(/,/g, ""))
    const price = parseFloat((formState.price || "0").replace(/,/g, ""))

    // For placeholders
    const calculatedFee = quantity * price * 0.00072
    const calculatedTaxes = quantity * price * 0.001

    // For final calculation, using user input if available
    const finalFees = parseFloat((formState.fees || "0").replace(/,/g, ""))
    const finalTaxes = parseFloat((formState.taxes || "0").replace(/,/g, ""))

    let proceedsAmount = 0
    if (transactionType === "buy") {
      proceedsAmount = quantity * price + finalFees
    } else if (transactionType === "sell") {
      proceedsAmount = quantity * price - finalFees - finalTaxes
    }

    return {
      estimatedFee: isNaN(calculatedFee) ? "0" : `~ ${formatNum(calculatedFee)}`,
      estimatedTaxes: isNaN(calculatedTaxes)
        ? "0"
        : `~ ${formatNum(calculatedTaxes)}`,
      estimatedProceeds: isNaN(proceedsAmount) ? "0" : formatNum(proceedsAmount),
    }
  }, [
    formState.quantity,
    formState.price,
    formState.fees,
    formState.taxes,
    transactionType,
  ])
 
   if (loading) {
     return <div>Loading...</div>
   }

  return (
    <>
      <div className="grid gap-3">
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
      <div className="grid gap-3">
        <Label htmlFor="cash_asset_id">Cash</Label>
        <Select
          name="cash_asset_id"
          onValueChange={handleSelectChange("cash_asset_id")}
          value={formState.cash_asset_id}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select cash..." />
          </SelectTrigger>
          <SelectContent>
            {assets
              .filter(
                asset => asset.securities && asset.securities.asset_class === "cash",
              )
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.securities?.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="asset">Assets</Label>
        <Combobox
          items={assets
            .filter(
              asset =>
                asset.securities &&
                ["stock", "crypto"].includes(asset.securities.asset_class),
            )
            .map(asset => ({
              value: asset.id,
              label: `${asset.securities?.ticker} - ${asset.securities?.name}`,
            }))}
          value={formState.asset}
          onChange={handlePickerChange("asset")}
          placeholder={
            `Select asset you're ${transactionType}ing...`
          }
          searchPlaceholder="Search asset..."
          emptyPlaceholder="No assets found."
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="quantity">
          {transactionType === "buy" ? "Buy " : "Sell "}Quantity
        </Label>
        <Input
          id="quantity"
          name="quantity"
          type="text"
          inputMode="decimal"
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
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={formState.price || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="fees">Fees</Label>
        <Input
          id="fees"
          name="fees"
          type="text"
          inputMode="decimal"
          placeholder={estimatedFee}
          value={formState.fees || ""}
          onChange={handleInputChange}
        />
      </div>
      {transactionType === "sell" && (
        <div className="grid gap-3">
          <Label htmlFor="taxes">Taxes</Label>
          <Input
            id="taxes"
            name="taxes"
            type="text"
            inputMode="decimal"
            placeholder={estimatedTaxes}
            value={formState.taxes || ""}
            onChange={handleInputChange}
          />
        </div>
      )}
        <div className="col-span-2 flex justify-end text-xs font-thin">
          {`Estimated net amount: ${estimatedProceeds}`}
        </div>
    </>
  )
}