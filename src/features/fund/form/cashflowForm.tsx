"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useWatch, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField } from "@/components/form/number-field"
import { ComboboxField } from "@/components/form/combobox-field"
import { RadioGroupField } from "@/components/form/radiogroup-field"
import { FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { getCashAssets } from "@fund/actions/get-cash-assets"
import type { Tables } from "@/types/database.types"
import { cashflowSchema } from "./schema"
import { CASHFLOW } from "@fund/memo"
import { cashflowOps } from "../config"

type FormValues = z.infer<typeof cashflowSchema>

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
      CASHFLOW[operation]?.map((memo) => ({
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
      const { error } = await supabase.rpc("add_cashflow_event", {
        p_operation: data.operation,
        p_asset_id: data.asset,
        p_quantity: data.quantity,
        p_fx_rate: data.fx_rate ?? 1,
        p_memo: data.memo,
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
    <div className="flex flex-col gap-6">
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <RadioGroupField
            control={form.control}
            name="operation"
            options={cashflowOps}
            column={2}
          />

          <ComboboxField
            control={form.control}
            name="memo"
            label="Description"
            items={filteredMemos}
            placeholder="Select description preset"
            searchPlaceholder="Search for description..."
          />

          <ComboboxField
            control={form.control}
            name="asset"
            label="Asset"
            items={assetIDs}
            placeholder="Select cash or fund asset"
            searchPlaceholder="Search for asset..."
          />

          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            placeholder="Total amount in original currency"
            suffix="VND"
          />

          <NumberField
            control={form.control}
            name="fx_rate"
            label="FX Rate"
            placeholder="Foreign exchange rate to VND"
            disabled={isVND}
            suffix="VND"
          />
        </FieldGroup>
      </form>
    </div>
  )
}
