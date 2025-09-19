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
import { formatNum } from "@/lib/utils"
import { FormRow } from "@/components/form-row"
import { Loading } from "@/components/loader"

type DebtPaymentFormProps = {
  formState: Record<string, string | undefined>
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSelectChange: (name: string) => (value: string) => void
}

export function DebtPaymentForm({
  formState,
  handleInputChange,
  handleSelectChange,
}: DebtPaymentFormProps) {
  const { assets, debts, loading } = useAccountData()
    
  if (loading) {
    return <Loading/>
  }
  
  return (
    <div className="flex flex-col gap-3">
      <FormRow label="Debt">
        <Select
          name="debt"
          onValueChange={handleSelectChange("debt")}
          value={formState.debt}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select debt..." />
          </SelectTrigger>
          <SelectContent>
            {debts.map(debt => (
              <SelectItem key={debt.id} value={debt.id}>
                {debt.lender_name} - {formatNum(debt.principal_amount)} VND
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>
      <FormRow label="Cash Asset">
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
                asset => asset && asset.asset_class === "cash",
              )
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </FormRow>
      <FormRow label="Principal">
        <Input
          id="principal_payment"
          name="principal_payment"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={formState.principal_payment || ""}
          onChange={handleInputChange}
        />
      </FormRow>
      <FormRow label="Interest">
        <Input
          id="interest_payment"
          name="interest_payment"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={formState.interest_payment || ""}
          onChange={handleInputChange}
        />
      </FormRow>
    </div>
  )
}