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

type DividendFormProps = {
  formState: Record<string, string | undefined>
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSelectChange: (name: string) => (value: string) => void
  handlePickerChange: (name: string) => (value: string | undefined) => void
}

export function DividendForm({
  formState,
  handleInputChange,
  handleSelectChange,
  handlePickerChange,
}: DividendFormProps) {
  const { accounts, assets, loading } = useTransactionFormData()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="grid gap-3">
        <Label htmlFor="account">To Account</Label>
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
              .filter(
                asset =>
                  asset.asset_class === "cash" || asset.asset_class === "epf",
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
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="dividend-asset">Asset</Label>
        <Combobox
          items={assets
            .filter(
              asset =>
                asset.asset_class === "stock" || asset.asset_class === "epf",
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
    </>
  )
}