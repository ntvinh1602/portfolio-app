"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTransactionFormData } from "@/hooks/useTransactionFormData"
import { Combobox } from "@/components/combobox"

type SplitFormProps = {
  formState: Record<string, string | undefined>
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handlePickerChange: (name: string) => (value: string | undefined) => void
}

export function SplitForm({
  formState,
  handleInputChange,
  handlePickerChange,
}: SplitFormProps) {
  const { assets, loading } = useTransactionFormData()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
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
  )
}