"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAccountData } from "@/hooks/useAccountData"
import { Combobox } from "@/components/combobox"
import { FormRow } from "@/components/form-row"
import { Loading } from "@/components/loader"

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
  const { assets, loading } = useAccountData()
    
  if (loading) {
    return <Loading/>
  }

  return (
    <div className="flex flex-col gap-3">
      <FormRow label="Quantity">
        <Input
          id="quantity"
          name="quantity"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={formState.quantity || ""}
          onChange={handleInputChange}
        />
      </FormRow>

      <FormRow label="Cash">
        <Select
          name="asset"
          onValueChange={handleSelectChange("asset")}
          value={formState.cash_asset_id}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select cash asset to be debited" />
          </SelectTrigger>
          <SelectContent>
            {assets
              .filter(asset => asset && (
                asset.asset_class === "cash" ||
                asset.asset_class === "fund"
              ))
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset?.name}
                </SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </FormRow>

      <FormRow label="Dividend from">
        <Combobox
          items={assets
            .filter(asset => asset && (
              asset.asset_class === "stock" ||
              asset.asset_class === "fund"
            ))
            .map(asset => ({
              value: asset.id,
              label: `${asset?.ticker} - ${asset?.name}`
            }))
          }
          value={formState.dividend_asset}
          onChange={handlePickerChange("dividend_asset")}
          placeholder="Select the source of the dividend..."
          searchPlaceholder="Search assets..."
          emptyPlaceholder="No assets found."
        />
      </FormRow>
    </div>
  )
}