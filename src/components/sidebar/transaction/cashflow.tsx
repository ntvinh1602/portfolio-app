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
import { useAccountData } from "@/hooks/useAccountData"
import { Enums } from "@/types/database.types"
import { FormRow } from "@/components/form-row"
import { Loading } from "@/components/loader"

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
  const { assets, loading } = useAccountData()

  if (loading) {
    return <Loading/>
  }

  return (
    <div className="flex flex-col gap-3">
      {["income", "expense"].includes(transactionType) && (
        <FormRow label="Description">
          <Input
            id="description"
            name="description"
            type="text"
            placeholder="Enter a description..."
            value={formState.description || ""}
            onChange={handleInputChange}
          />
        </FormRow>
      )}
      <FormRow label="Quantity">
        <Input
          id="quantity"
          name="quantity"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={formState.quantity || ""}
          onChange={handleInputChange}
        />
      </FormRow>
      <FormRow label="Asset">
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
                  asset &&
                  (asset.asset_class === "cash" ||
                    asset.asset_class === "fund" ||
                    asset.asset_class === "crypto"),
              )
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FormRow>
    </div>
  )
}