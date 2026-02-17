"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { TextField, SelectField, ComboboxField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { useCurrency } from "@/hooks/useCurrency"
import { useAssets } from "@/hooks/useAssets"
import { RotateCcw, SaveIcon, Shredder } from "lucide-react"
import { editSchema } from "./schema"

type FormValues = z.infer<typeof editSchema>

export function EditStockForm({ onSuccess }: { onSuccess?: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)
  const { data: assets, mutate } = useAssets()
  const { data: currencyData } = useCurrency()

  const form = useForm<FormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      id: "",
      asset_class: "",
      ticker: "",
      name: "",
      currency_code: "",
      logo_url: "",
    },
  })

  const assetId = useWatch({ control: form.control, name: "id" })

  // ✅ Proper currency options mapping
  const currencyOptions = React.useMemo(
    () =>
      currencyData.map((c) => ({
        value: c.code,
        label: `${c.code} — ${c.name}`,
      })),
    [currencyData]
  )

  // ✅ Asset options
  const assetOptions = React.useMemo(
    () =>
      assets
        .filter((a) => ["stock", "cash", "fund"].includes(a.asset_class))
        .map((a) => ({
          label: `${a.ticker} — ${a.name}`,
          value: a.id,
        })),
    [assets]
  )

  // ✅ Auto-fill fields when selecting asset
  React.useEffect(() => {
    if (!assetId || !assets.length) return
    const selected = assets.find((a) => a.id === assetId)
    if (!selected) return

    form.setValue("asset_class", selected.asset_class ?? "")
    form.setValue("ticker", selected.ticker ?? "")
    form.setValue("name", selected.name ?? "")
    form.setValue("currency_code", selected.currency_code ?? "")
    form.setValue("logo_url", selected.logo_url ?? "")
  }, [assetId, assets, form])

  // ✅ Update asset
  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("assets")
        .update({
          asset_class: values.asset_class,
          ticker: values.ticker,
          name: values.name,
          currency_code: values.currency_code,
          logo_url: values.logo_url,
        })
        .eq("id", values.id)

      if (error) toast.error("Update failed", { description: error.message })
      else {
        toast.success("Asset updated successfully")
        mutate()
        onSuccess?.()
      }
    } catch (err) {
      toast.error("Unexpected error", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  // ✅ Delete asset
  async function handleDelete() {
    if (!assetId) {
      toast.warning("Please select a stock first")
      return
    }

    const confirmDelete = confirm("Are you sure you want to delete this stock?")
    if (!confirmDelete) return

    setLoading(true)
    try {
      const { error } = await supabase.from("assets").delete().eq("id", assetId)
      if (error) toast.error("Delete failed", { description: error.message })
      else {
        toast.success("Stock deleted successfully")
        form.reset()
        mutate()
        onSuccess?.()
      }
    } catch (err) {
      toast.error("Unexpected error", {
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form id="edit-stock-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <ComboboxField
            control={form.control}
            name="id"
            label="Asset"
            items={assetOptions}
            placeholder="Choose an asset to update"
            searchPlaceholder="Search for asset..."
          />

          <SelectField
            control={form.control}
            name="asset_class"
            label="Asset Class"
            placeholder="Select an asset class"
            options={[
              { label: "Stock", value: "stock" },
              { label: "Crypto", value: "crypto" },
              { label: "Cash", value: "cash" },
              { label: "Fund", value: "fund" },
            ]}
          />

          <TextField control={form.control} name="ticker" label="Ticker" placeholder="Ticker" />
          <TextField control={form.control} name="name" label="Name" placeholder="Full name" />

          <SelectField
            control={form.control}
            name="currency_code"
            label="Currency"
            placeholder="Select currency"
            options={currencyOptions}
          />

          <TextField
            control={form.control}
            name="logo_url"
            label="Logo URL"
            placeholder="URL of asset logo"
          />
        </FieldGroup>
      </form>

      <Field className="flex justify-end gap-2" orientation="horizontal">
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          <RotateCcw />Reset
        </Button>
        <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
          <Shredder />Delete
        </Button>
        <Button type="submit" form="edit-stock-form" disabled={loading}>
          <SaveIcon />{loading ? "Saving..." : "Save"}
        </Button>
      </Field>
    </div>
  )
}
