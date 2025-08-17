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
import { Enums } from "@/lib/database.types"

type CashFlowFormProps = {
  transactionType: Enums<"transaction_type">
  formState: Record<string, string | undefined>
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSelectChange: (name: string) => (value: string) => void
}

export function CashFlowForm({
  transactionType,
  formState,
  handleInputChange,
  handleSelectChange,
}: CashFlowFormProps) {
  const { assets, loading } = useTransactionFormData()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      {["income", "expense"].includes(transactionType) && (
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
      )}
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="quantity">Quantity</Label>
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
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="asset">Asset</Label>
        <Select
          name="asset"
          onValueChange={handleSelectChange("asset")}
          value={formState.asset}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={
              `Select cash asset to be ` +
              (transactionType === "deposit" || transactionType === "income"
                ? "debited"
                : "credited") + `...`
            } />
          </SelectTrigger>
          <SelectContent>
            {assets
              .filter(
                asset =>
                  asset.securities &&
                  (asset.securities.asset_class === "cash" ||
                    asset.securities.asset_class === "epf" ||
                    asset.securities.asset_class === "crypto"),
              )
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.securities?.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}