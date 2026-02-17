"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useWatch, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField, ComboboxField, RadioGroupField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { useAssets } from "@/hooks/useAssets"
import { cashflowSchema } from "./schema"

type FormValues = z.infer<typeof cashflowSchema>

export function CashflowForm() {
  const supabase = createClient()
  const { data: assetData } = useAssets()
  const [loading, setLoading] = React.useState(false)
  const [memoOptions, setMemoOptions] = React.useState<
  { value: string; label: string; operation: string }[]
>([])

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
  
  React.useEffect(() => {
    async function loadMemos() {
      const { data, error } = await supabase
        .from("cashflow_memo")
        .select("operation,memo")

      if (error) {
        toast.error("Failed to load memo list", { description: error.message })
        return
      }

      setMemoOptions(
        data?.map((m) => ({
          value: m.memo,
          label: m.memo,
          operation: m.operation,
        })) ?? []
      )
    }

    loadMemos()
  }, [supabase])
  
  const filteredMemos = React.useMemo(
    () => memoOptions.filter((m) => m.operation === operation),
    [memoOptions, operation]
  )
  
  const assetIDs = React.useMemo(() => {
    const seen = new Set<string>()
    return assetData
      .filter((a) => a.asset_class === "cash" || a.asset_class === "fund")
      .map((a) => ({
        value: a.id,
        label: a.name ? `${a.ticker} — ${a.name}` : a.ticker,
        currency: a.currency_code
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
    setLoading(true)
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
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again later."
      toast.error("Unexpected error", { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form id="cashflow-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <RadioGroupField
            control={form.control}
            name="operation"
            options={[
              { value: "deposit", label: "Deposit", description: "Paid-in capital" },
              { value: "withdraw", label: "Withdraw", description: "Time to treat yourself!" },
              { value: "income", label: "Income", description: "Free money!" },
              { value: "expense", label: "Expense", description: "So expensive!" },
            ]}
            column="grid-cols-2"
          />

          <ComboboxField
            control={form.control}
            name="memo"
            label="Description"
            items={filteredMemos}
            placeholder="Select description preset"
            searchPlaceholder="Search for desription..."
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
      <Field className="flex justify-end" orientation="horizontal">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
        <Button type="submit" form="cashflow-form" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </div>
  )
}
