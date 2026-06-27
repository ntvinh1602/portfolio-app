"use client"

import * as React from "react"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { NumberField } from "@/components/form/number-field"
import { ComboboxField } from "@/components/form/combobox-field"
import { RadioGroupField } from "@/components/form/radiogroup-field"
import { FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { stockSchema } from "./schema"
import { searchAssets, type AssetSearchResult } from "@fund/actions/search-assets"
import { stockOps } from "@fund/config"

type FormValues = z.infer<typeof stockSchema>

interface StockFormProps {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
}

export function StockForm({
  onSuccess,
  formId,
  onLoadingChange,
  resetFormRef,
}: StockFormProps) {
  const supabase = createClient()
  const [search, setSearch] = React.useState("")
  const [assets, setAssets] = React.useState<AssetSearchResult[]>([])

  React.useEffect(() => {
    if (search.length < 2) {
      setAssets([])
      return
    }
    const timer = setTimeout(() => {
      searchAssets(search, "stock").then(setAssets)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const stockOptions = React.useMemo(
    () =>
      assets.map((a) => ({
        value: a.ticker,
        label: `${a.ticker} — ${a.name}`,
      })),
    [assets],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      side: "buy",
    },
  })

  const side = useWatch({
    control: form.control,
    name: "side",
  })

  // Expose form.reset() to the dialog footer via the ref
  React.useEffect(() => {
    resetFormRef.current = () => form.reset()
  }, [form, resetFormRef])

  // Reset tax when switching to "buy" — tax only applies to sells.
  // Without this, a value entered during "sell" persists in form state
  // and is submitted via p_tax: data.tax ?? 0.
  React.useEffect(() => {
    if (side === "buy") form.resetField("tax")
  }, [side, form])

  async function onSubmit(data: FormValues) {
    onLoadingChange(true)
    try {
      const { error } = await supabase.rpc("add_stock_event", {
        p_side: data.side,
        p_ticker: data.ticker,
        p_price: data.price,
        p_quantity: data.quantity,
        p_fee: data.fee,
        p_tax: data.tax ?? 0,
      })

      if (error) {
        toast.error("Transaction failed", {
          description: error.message,
        })
      } else {
        toast.success("Stock transaction added", {
          description: `${data.side.toUpperCase()} ${data.quantity} ${data.ticker} @ ${data.price}`,
        })
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

  return (
    <div className="flex flex-col gap-6">
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <RadioGroupField
            control={form.control}
            name="side"
            options={stockOps}
            column={2}
          />

          <ComboboxField
            control={form.control}
            name="ticker"
            label="Stock"
            items={stockOptions}
            onSearchChange={setSearch}
            placeholder="Select a stock"
            searchPlaceholder="Enter ticker to search..."
          />

          <NumberField
            control={form.control}
            name="price"
            label="Price"
            placeholder="Input price in full, no decimals"
            suffix="VND"
          />

          <NumberField
            control={form.control}
            name="quantity"
            label="Quantity"
            placeholder="Number of shares"
            suffix="Units"
          />

          <NumberField
            control={form.control}
            name="fee"
            label="Fee"
            placeholder="Total transaction fees"
            suffix="VND"
          />

          <NumberField
            control={form.control}
            name="tax"
            label="Tax"
            placeholder="Total income tax"
            suffix="VND"
            disabled={side === "buy"}
          />
        </FieldGroup>
      </form>
    </div>
  )
}
