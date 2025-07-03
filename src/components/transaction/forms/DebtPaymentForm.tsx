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
  const { accounts, assets, debts, loading } = useTransactionFormData()

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="grid gap-3">
        <Label htmlFor="debt">Debt</Label>
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
                {debt.lender_name} ({debt.principal_amount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="from-account">From Account</Label>
        <Select
          name="from-account"
          onValueChange={handleSelectChange("from-account")}
          value={formState["from-account"]}
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
              .filter(asset => asset.asset_class === "cash")
              .map(asset => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3">
        <Label htmlFor="principal-payment">Principal</Label>
        <Input
          id="principal-payment"
          name="principal-payment"
          type="number"
          placeholder="0.00"
          value={formState["principal-payment"] || ""}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="interest-payment">Interest</Label>
        <Input
          id="interest-payment"
          name="interest-payment"
          type="number"
          placeholder="0.00"
          value={formState["interest-payment"] || ""}
          onChange={handleInputChange}
        />
      </div>
    </>
  )
}