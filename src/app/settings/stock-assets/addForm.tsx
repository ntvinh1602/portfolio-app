"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { TextField, SelectField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { addSchema } from "./schema"
import { useCurrency } from "@/hooks/useCurrency"

// Infer form values from schema
type FormValues = z.infer<typeof addSchema>

export function AddAssetForm({ onSuccess }: { onSuccess?: () => void }) {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)

  // Fetch currency list
  const { data: currencyData } = useCurrency()
  const currency = React.useMemo(
    () => currencyData.map((a) => ({ value: a.code, label: a.name })),
    [currencyData]
  )

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: {
      asset_class: "stock",
      ticker: "",
      name: "",
      currency_code: "VND",
      logo_url: "",
    },
  })

  // Handle submit
  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("assets")
        .insert([
          {
            asset_class: values.asset_class,
            ticker: values.ticker,
            name: values.name,
            currency_code: values.currency_code,
            logo_url: values.logo_url,
          },
        ])

      if (error) {
        toast.error("Insert failed", { description: error.message })
      } else {
        toast.success("Asset added successfully")
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
      setLoading(false)
    }
  }

  // UI
  return (
    <div className="flex flex-col gap-6">
      <form id="borrow-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
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

          <TextField
            control={form.control}
            name="ticker"
            label="Ticker"
            placeholder="Ticker of the asset"
          />

          <TextField
            control={form.control}
            name="name"
            label="Name"
            placeholder="Full name of the asset"
          />

          <SelectField
            control={form.control}
            name="currency_code"
            label="Currency"
            placeholder="Select currency of the asset"
            options={currency}
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
          Reset
        </Button>
        <Button type="submit" form="borrow-form" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </Field>
    </div>
  )
}
