"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField, ComboboxField } from "@/components/form/fields"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { repaySchema } from "./schema"
import { formatNum } from "@/lib/utils"

type FormValues = z.infer<typeof repaySchema>

export function RepayForm() {
  const supabase = createClient()
  const [loading, setLoading] = React.useState(false)
  const [debtOptions, setDebtOptions] = React.useState<
      { value: string; label: string }[]
    >([])

  const form = useForm<FormValues>({
    resolver: zodResolver(repaySchema),
    defaultValues: {},
  })
  
  React.useEffect(() => {
    async function loadDebts() {
      const { data, error } = await supabase
        .from("outstanding_debts")
        .select("tx_id,lender,principal,rate")

      if (error) {
        toast.error("Failed to load debts", { description: error.message })
        return
      }

      setDebtOptions(
        data.map((d) => ({
          value: d.tx_id,
          label: `${d.lender} — ${formatNum(d.principal)} at ${d.rate}%`,
        }))
      )
    }
    
    loadDebts()
  }, [supabase])

  async function onSubmit(data: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase.rpc("add_repay_event", {
        p_repay_tx: data.repay_tx,
        p_interest: data.interest
      })

      if (error) {
        toast.error("Transaction failed", { description: error.message })
      } else {
        toast.success("Repay event added")
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
          <ComboboxField
            control={form.control}
            name="repay_tx"
            label="Deal"
            items={debtOptions}
            placeholder="Select debt"
            searchPlaceholder="Search for debts..."
          />

          <NumberField
            control={form.control}
            name="interest"
            label="Paid Interest"
            placeholder="Input actual amount of interest paid in this deal"
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
