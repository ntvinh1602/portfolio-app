"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField } from "@/components/form/number-field"
import { ComboboxField } from "@/components/form/combobox-field"
import { FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { repaySchema } from "./schema"
import { formatNum } from "@/lib/utils"
import { mutate } from "swr"

type FormValues = z.infer<typeof repaySchema>

interface RepayFormProps {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
}

export function RepayForm({
  onSuccess,
  formId,
  onLoadingChange,
  resetFormRef,
}: RepayFormProps) {
  const supabase = createClient()
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
        })),
      )
    }

    loadDebts()
  }, [supabase])

  async function onSubmit(data: FormValues) {
    onLoadingChange(true)
    try {
      const { error } = await supabase.rpc("add_repay_event", {
        p_repay_tx: data.repay_tx,
        p_interest: data.interest,
      })

      if (error) {
        toast.error("Transaction failed", { description: error.message })
      } else {
        toast.success("Repay event added")
        form.reset()
        onSuccess?.()
      }

      await mutate(
        (key) => Array.isArray(key) && key[0] === "priceRefresh",
        undefined,
        { revalidate: true },
      )
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
    </div>
  )
}
