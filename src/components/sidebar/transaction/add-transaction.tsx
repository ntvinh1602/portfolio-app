"use client"

import * as React from "react"
import { formatISO } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Enums } from "@/types/database.types"
import { toast } from "sonner"
import { mutate } from "swr"
import { useBlueprintMap } from "./blueprints"
import { preparePayload } from "./prepare-payload"
import { SchemaForm } from "@/components/form/schemaForm"
import { txnSchema } from "@/components/sidebar/transaction/schema"
import { refreshData } from "@/lib/refresh"

export function TransactionForm({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const blueprintMap = useBlueprintMap()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // ✅ initialize with "buy" as the default
  const [txnType, setTxnType] = React.useState<Enums<"transaction_type">>("buy")

  const [formState, setFormState] = React.useState<
    Record<string, string | undefined>
  >({
    transaction_type: "buy",
    transaction_date: formatISO(new Date(), { representation: "date" }),
  })

  const handleChange = React.useCallback(
    (name: string, value: string | undefined) => {
      if (name === "transaction_type") {
        setTxnType(value as Enums<"transaction_type">)
      }
      setFormState((prev) => ({ ...prev, [name]: value }))
    },
    []
  )

  // ✅ Reset whenever the dialog is opened
  React.useEffect(() => {
    if (open) {
      setTxnType("buy")
      setFormState({
        transaction_type: "buy",
        transaction_date: formatISO(new Date(), { representation: "date" }),
      })
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = preparePayload(
        formState,
        blueprintMap[txnType],
        txnType
      )
      const validated = txnSchema.safeParse(payload)

      if (!validated.success) {
        const messages = validated.error.issues.map(
          (issue) => `${issue.path.join(".")} is ${issue.message.toLowerCase()}`
        )
        throw new Error(messages.join("; "))
      }

      const response = await fetch("/api/database/add-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "An unknown error occurred.")
      }

      setFormState({})
      await refreshData("dashboard", "/api/gateway/dashboard")
      toast.success("Transaction saved successfully!")
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred."
      toast.error(`Failed to save transaction: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
          <SchemaForm
            id="transaction-form"
            blueprint={blueprintMap[txnType]}
            formState={formState}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        <DialogFooter className="sticky bottom-0 bg-card/0">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="transaction-form" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
