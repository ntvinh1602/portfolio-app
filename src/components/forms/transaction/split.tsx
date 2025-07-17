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
        <Label htmlFor="asset">Stock</Label>
        <Combobox
          items={assets
            .filter(
              asset => asset.securities && asset.securities.asset_class === "stock",
            )
            .map(asset => ({
              value: asset.id,
              label: `${asset.securities?.ticker} - ${asset.securities?.name}`,
            }))}
          value={formState.asset}
          onChange={handlePickerChange("asset")}
          placeholder="Select stock..."
          searchPlaceholder="Search stocks..."
          emptyPlaceholder="No assets found."
        />
      </div>
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="split_quantity">Quantity of new shares received</Label>
        <Input
          id="split_quantity"
          name="split_quantity"
          type="number"
          placeholder="0"
          value={formState.split_quantity || ""}
          onChange={handleInputChange}
        />
      </div>
    </>
  )
}