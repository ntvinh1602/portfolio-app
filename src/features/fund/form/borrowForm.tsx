"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { NumberField } from "@/components/form/number-field"
import { TextField } from "@/components/form/text-field"
import { DateTimeField } from "@/components/form/datetime-field"
import { FieldDescription, FieldGroup } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { borrowSchema } from "./schema"

type FormValues = z.infer<typeof borrowSchema>

interface BorrowFormProps {
  onSuccess?: () => void
  formId: string
  onLoadingChange: (loading: boolean) => void
  resetFormRef: { current: () => void }
}

export function BorrowForm({
  onSuccess,
  formId,
  onLoadingChange,
  resetFormRef,
}: BorrowFormProps) {
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(borrowSchema),
    defaultValues: {
      lender: "",
    },
  })

  async function onSubmit(data: FormValues) {
    onLoadingChange(true)
    try {
      const createdAt = data.created_at
        ? new Date(data.created_at).toISOString()
        : undefined

      const { error } = await supabase.rpc("add_borrow_event", {
        p_principal: data.principal,
        p_lender: data.lender,
        p_rate: data.rate,
        p_created_at: createdAt,
      })

      if (error) {
        toast.error("Transaction failed", { description: error.message })
      } else {
        toast.success("Debt added")
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
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-3">
        <DateTimeField
          control={form.control}
          name="created_at"
          label="Date & Time"
        />

        <TextField
          control={form.control}
          name="lender"
          label="Lender"
          placeholder="Lender name"
        />
        <FieldDescription className="text-right">
          Note: Add unique identifier for repeated lenders
        </FieldDescription>
        <NumberField
          control={form.control}
          name="principal"
          label="Debt Principal"
          placeholder="Debt principal in whole number"
          suffix="VND"
        />

        <NumberField
          control={form.control}
          name="rate"
          label="Interest rate"
          placeholder="Interest rate"
          suffix="% p.a"
        />
      </FieldGroup>
    </form>
  )
}
