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
  const { assets, loading } = useTransactionFormData()
 
   if (loading) {
     return <div>Loading...</div>
   }

  return (
    <>
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
    </>
  )
}