"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField, TextField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { borrowSchema } from "./schema"

type FormValues = z.infer<typeof borrowSchema>

export function BorrowForm() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(borrowSchema),
    defaultValues: {},
  })

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase.rpc("add_borrow_event", {
        p_principal: data.principal,
        p_lender: data.lender,
        p_rate: data.rate,
      })

      if (error) {
        toast.error("Transaction failed", { description: error.message })
      } else {
        toast.success("Debt added")
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
          <TextField
            control={form.control}
            name="lender"
            label="Lender"
            placeholder="Add suffix for repeated lenders"
          />

          <NumberField
            control={form.control}
            name="principal"
            label="Debt Principal"
            placeholder="Input debt principal as a whole number"
            suffix="VND"
          />

          <NumberField
            control={form.control}
            name="rate"
            label="Interest rate"
            placeholder="Input interest rate, up to 2 decimal points"
            suffix="% per annum"
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
