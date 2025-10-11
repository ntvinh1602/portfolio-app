"use client"

import { useState, useCallback, useEffect, FormEvent } from "react"
import { formatISO } from "date-fns"
import { refreshData } from "@/lib/refresh"
import { Button } from "@/components/ui/button"
import {
  Root,
  Content,
  Footer,
  Header,
  Title,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { useBlueprintMap } from "./blueprints"
import { preparePayload } from "./prepare-payload"
import { SchemaForm } from "@/components/form/schemaForm"
import { txnSchema } from "@/components/sidebar/add-transaction/schema"
import { z } from "zod"

// ✅ validated data type
type TransactionData = z.infer<typeof txnSchema>

// ✅ form state: all fields optional, stored as strings during editing
type TransactionFormState = { [K in keyof TransactionData]?: string }

export function TransactionForm({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const blueprintMap = useBlueprintMap()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<TransactionFormState>({
    transaction_type: "buy",
    transaction_date: formatISO(new Date(), { representation: "date" }),
  })

  // derive txnType from formState
  const txnType = formState.transaction_type as TransactionData["transaction_type"]

  const handleChange = useCallback(
    <K extends keyof TransactionFormState>(
      name: K,
      value: string | undefined
    ) => {
      if (name === "transaction_date" && value) {
        const formattedDate = formatISO(new Date(value), {
          representation: "date",
        })
        setFormState((prev) => ({ ...prev, [name]: formattedDate }))
      } else {
        setFormState((prev) => ({ ...prev, [name]: value }))
      }
    },
    []
  )

  // reset form whenever dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        transaction_type: "buy",
        transaction_date: formatISO(new Date(), { representation: "date" }),
      })
    }
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = preparePayload(formState, blueprintMap[txnType], txnType)
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
      onOpenChange(false)
      // 🔄 refresh dashboard data
      await refreshData("dashboard", "api/gateway/dashboard")
      toast.success("Transaction saved successfully!")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred."
      toast.error(`Failed to save transaction: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Root open={open} onOpenChange={onOpenChange}>
      <Content className="flex flex-col">
        <Header>
          <Title>Add Transaction</Title>
        </Header>

        <form id="transaction-form" onSubmit={handleSubmit}>
          <SchemaForm<TransactionFormState>
            blueprint={blueprintMap[txnType]}
            formState={formState}
            onChange={handleChange}
          />
        </form>

        <Footer className="sticky bottom-0 bg-card/0">
          <Button type="submit" form="transaction-form" disabled={isSubmitting}>
            <Save /> Save
          </Button>
        </Footer>
      </Content>
    </Root>
  )
}
