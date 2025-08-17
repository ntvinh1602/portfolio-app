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
  const { assets, loading } = useTransactionFormData()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          name="quantity"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={formState.quantity || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="asset">Cash asset to be debited</Label>
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
                  asset.securities &&
                  (asset.securities.asset_class === "cash" ||
                    asset.securities.asset_class === "epf"),
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
        <Label htmlFor="dividend_asset">Dividend Asset</Label>
        <Combobox
          items={assets
            .filter(
              asset =>
                asset.securities &&
                (asset.securities.asset_class === "stock" ||
                  asset.securities.asset_class === "epf"),
            )
            .map(asset => ({
              value: asset.id,
              label: `${asset.securities?.ticker} - ${asset.securities?.name}`,
            }))}
          value={formState.dividend_asset}
          onChange={handlePickerChange("dividend_asset")}
          placeholder="Select asset..."
          searchPlaceholder="Search assets..."
          emptyPlaceholder="No assets found."
        />
      </div>
    </>
  )
}