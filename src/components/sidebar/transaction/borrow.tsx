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
import { FormRow } from "@/components/form-row"
import { Loading } from "@/components/loader"

type BorrowFormProps = {
  formState: Record<string, string | undefined>
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSelectChange: (name: string) => (value: string) => void
}

export function BorrowForm({
  formState,
  handleInputChange,
  handleSelectChange,
}: BorrowFormProps) {
  const { assets, loading } = useAccountData()

  if (loading) {
    return <Loading/>
  }

  return (
    <div className="flex flex-col gap-3">
      <FormRow label="Lender">
        <Input
          id="lender"
          name="lender"
          placeholder="Enter lender name..."
          value={formState.lender || ""}
          onChange={handleInputChange}
        />
      </FormRow>
      <FormRow label="Cash Asset">
        <Select
          name="asset"
          onValueChange={handleSelectChange("asset")}
          value={formState.asset}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select cash asset..." />
          </SelectTrigger>
          <SelectContent>
            {assets
              .filter(
                asset => asset.asset_class === "cash",
              )
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FormRow>
      <FormRow label="Principal Amount">
        <Input
          id="principal"
          name="principal"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={formState.principal || ""}
          onChange={handleInputChange}
        />
      </FormRow>
      <FormRow label="Interest Rate (%)">
        <Input
          id="interest_rate"
          name="interest_rate"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={formState.interest_rate || ""}
          onChange={handleInputChange}
        />
      </FormRow>
    </div>
  )
}