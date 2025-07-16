"use client"

import * as React from "react"
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
        <Label htmlFor="cash_asset_id">Cash Source</Label>
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
        <Label htmlFor="asset">
          {transactionType === "buy" ? "Purchased " : "Sold "}Assets
        </Label>
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
          placeholder="Select asset..."
          searchPlaceholder="Search assets..."
          emptyPlaceholder="No assets found."
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="quantity">
          {transactionType === "buy" ? "Purchased " : "Sold "}Quantity
        </Label>
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
      <div className="grid gap-3">
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
        <div className="grid gap-3">
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
  )
}