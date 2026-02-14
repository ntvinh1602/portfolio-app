"use client"

import * as React from "react"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { NumberField, ComboboxField, RadioGroupField } from "../fields"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
} from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { useAccountData } from "@/hooks/useAccountData"
import { stockSchema } from "../schema"

type FormValues = z.infer<typeof stockSchema>

export function StockForm() {
  const supabase = createClient()
  const { assetData } = useAccountData()
  const [loading, setLoading] = React.useState(false)

  // Filter only stock tickers and map to unique ticker names
  const stockTickers = React.useMemo(() => {
    const seen = new Set<string>()
    return assetData
      .filter((a) => a.asset_class === "stock")
      .map((a) => ({
        value: a.ticker,
        label: a.name ? `${a.ticker} — ${a.name}` : a.ticker,
      }))
      .filter((item) => {
        if (seen.has(item.value)) return false
        seen.add(item.value)
        return true
      })
  }, [assetData])

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
              { value: "buy", label: "Buy", description: "...the dip" },
              { value: "sell", label: "Sell", description: "Time to cash out!" },
            ]}
          />

          <ComboboxField
            control={form.control}
            name="ticker"
            label="Ticker"
            items={stockTickers}
            placeholder="Select a ticker"
            searchPlaceholder="Search tickers..."
          />

          <NumberField
            control={form.control}
            name="price"
            label="Price"
            placeholder="Matched price in full"
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
