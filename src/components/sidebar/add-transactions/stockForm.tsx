"use client"

import * as React from "react"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { NumberField, ComboboxField, RadioGroupField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
} from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { useAssets } from "@/hooks/useAssets"
import { stockSchema } from "./schema"

type FormValues = z.infer<typeof stockSchema>

export function StockForm() {
  const supabase = createClient()
  const { data: assetData } = useAssets()
  const [loading, setLoading] = React.useState(false)
  
  const stockTickers = React.useMemo(
    () =>
      assetData
        .filter((a) => a.asset_class === "stock")
        .map((a) => ({
          value: a.ticker,
          label: a.name ? `${a.ticker} — ${a.name}` : a.ticker,
        })),
    [assetData]
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      side: "buy"
    },
  })

  const side = useWatch({
    control: form.control,
    name: "side",
  });

  async function onSubmit(data: FormValues) {
    setLoading(true)
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
      }
    } catch (err) {
        const message = err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again later."
        toast.error("Unexpected error", { description: message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form id="stock-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <RadioGroupField
            control={form.control}
            name="side"
            options={[
              { value: "buy", label: "Buy", description: "Is it bottom yet?" },
              { value: "sell", label: "Sell", description: "Time to cash out!" },
            ]}
            column="grid-cols-2"
          />

          <ComboboxField
            control={form.control}
            name="ticker"
            label="Stock"
            items={stockTickers}
            placeholder="Select a stock"
            searchPlaceholder="Search for stock..."
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
      <Field className="flex justify-end" orientation="horizontal">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <Button type="submit" form="stock-form" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </div>
  )
}
