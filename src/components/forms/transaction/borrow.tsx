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
  const { accounts, assets, loading } = useTransactionFormData()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="grid gap-3 col-span-2">
        <Label htmlFor="lender">Lender Name</Label>
        <Input
          id="lender"
          name="lender"
          placeholder="Enter lender name..."
          value={formState.lender || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="principal">Principal Amount</Label>
        <Input
          id="principal"
          name="principal"
          type="number"
          placeholder="0"
          value={formState.principal || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="interest_rate">Interest Rate (%)</Label>
        <Input
          id="interest_rate"
          name="interest_rate"
          type="number"
          placeholder="0.0"
          value={formState.interest_rate || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="deposit_account_id">Deposit Account</Label>
        <Select
          name="deposit_account_id"
          onValueChange={handleSelectChange("deposit_account_id")}
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
        <Label htmlFor="asset">Cash Asset</Label>
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
    </>
  )
}