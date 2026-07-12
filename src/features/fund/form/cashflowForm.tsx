"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useWatch, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField } from "@/components/form/number-field"
import { DateTimeField } from "@/components/form/datetime-field"
import { FieldGroup, FieldTitle } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { getCashAssets } from "@fund/actions/get-cash-assets"
import type { Tables } from "@/types/database.types"
import { cashflowSchema } from "./schema"
import { ToggleGroupField } from "@/components/form/toggle-group-field"
import { SelectField } from "@/components/form/select-field"
import { txOperations } from "../components/ui/tx-filter"
import { stockOps } from "./stockForm"

type FormValues = z.infer<typeof cashflowSchema>

const CASHFLOW_MEMO = {
  deposit: ["Cash deposit", "EPF monthly contribution", "Reconciliation"],
  withdraw: ["Reconciliation", "Cash withdrawal"],
  income: [
    "CASA balance interest",
    "EPF dividend",
    "Cash dividend from stock",
    "Other reward/income",
    "Loyalty program rewards",
  ],
  expense: ["Margin interest", "Cash advance interest", "Operational fees"],
} as const

const cashflowOps = txOperations.cashflow.map(({ key, label }) => ({
  key,
  label,
}))

interface Props {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
}

export function CashflowForm({
  onSuccess,
  formId,
  onLoadingChange,
  resetFormRef,
}: Props) {
  const supabase = createClient()
  const [assetData, setAssetData] = React.useState<Tables<"assets">[]>([])

  React.useEffect(() => {
    getCashAssets().then(setAssetData)
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(cashflowSchema),
    defaultValues: {
      operation: "expense",
    },
  })

  const operation = useWatch({
    control: form.control,
    name: "operation",
  })

  const selectedAssetId = useWatch({
    control: form.control,
    name: "asset",
  })

  const filteredMemos = React.useMemo(() => {
    if (!operation) return []

    return (
      CASHFLOW_MEMO[operation]?.map((memo) => ({
        value: memo,
        label: memo,
      })) ?? []
    )
  }, [operation])

  const assetIDs = React.useMemo(() => {
    const seen = new Set<string>()
    return assetData
      .filter((a) => a.asset_class === "cash" || a.asset_class === "fund")
      .map((a) => ({
        value: a.id,
        label: a.name ? `${a.ticker} — ${a.name}` : a.ticker,
        currency: a.currency_code,
      }))
      .filter((item) => {
        if (seen.has(item.value)) return false
        seen.add(item.value)
        return true
      })
  }, [assetData])

  const selectedAsset = React.useMemo(() => {
    return assetIDs.find((a) => a.value === selectedAssetId)
  }, [assetIDs, selectedAssetId])

  const isVND = selectedAsset?.currency === "VND"

  async function onSubmit(data: FormValues) {
    onLoadingChange(true)
    try {
      const createdAt = data.created_at
        ? new Date(data.created_at).toISOString()
        : undefined

      const { error } = await supabase.rpc("add_cashflow_event", {
        p_operation: data.operation,
        p_asset_id: data.asset,
        p_quantity: data.quantity,
        p_fx_rate: data.fx_rate ?? 1,
        p_memo: data.memo,
        p_created_at: createdAt,
      })

      if (error) {
        toast.error("Transaction failed", { description: error.message })
      } else {
        toast.success("Cashflow event added", { description: data.memo })
        form.reset()
        onSuccess?.()
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again later."
      toast.error("Unexpected error", { description: message })
    } finally {
      onLoadingChange(false)
    }
  }

  // Expose form.reset() to the dialog footer via the ref
  React.useEffect(() => {
    resetFormRef.current = () => form.reset()
  }, [form, resetFormRef])

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-6">
        <div className="flex flex-col gap-3">
          <FieldTitle>Operation</FieldTitle>
          <ToggleGroupField
            control={form.control}
            name="operation"
            options={stockOps}
          />
        </div>

        <div className="flex flex-col gap-3">
          <FieldTitle>Details</FieldTitle>
          <DateTimeField
            control={form.control}
            name="created_at"
            label="Date time"
          />

          <SelectField
            control={form.control}
            name="memo"
            label="Description"
            placeholder="Event description"
            options={filteredMemos}
          />

          <SelectField
            control={form.control}
            name="asset"
            label="Asset"
            placeholder="Cash / fund asset"
            options={assetIDs}
          />

          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            placeholder="Amount in original currency"
            suffix="VND"
          />

          <NumberField
            control={form.control}
            name="fx_rate"
            label="FX Rate"
            placeholder="Exchange rate to VND"
            disabled={isVND}
            suffix="VND"
          />
        </div>
      </FieldGroup>
    </form>
  )
}
