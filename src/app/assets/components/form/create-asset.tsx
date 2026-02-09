"use client"

import { useState, useCallback, FormEvent } from "react"
import { Button } from "@/components/ui/button"
import * as Dialog from "@/components/ui/dialog"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { assetBlueprint } from "./blueprints"
import { preparePayload } from "./prepare-payload"
import { SchemaForm } from "@/components/form/schemaForm"
import { assetSchema } from "@/app/assets/components/form/schema"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { NormalizeError } from "@/lib/error"
import { showErrorToast } from "@/components/error-toast"

// ✅ form state: all fields optional, stored as strings during editing
type AssetFormState = { [K in keyof z.infer<typeof assetSchema>]?: string }

export function CreateAssetForm({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<AssetFormState>({})

  const handleChange = useCallback(
    <K extends keyof AssetFormState & string>(
      name: K,
      value: string | undefined
    ) => {
      setFormState((prev) => ({ ...prev, [name]: value }))
    }, []
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = preparePayload(formState)
      const validated = assetSchema.safeParse(payload)

      if (!validated.success) throw validated.error

      const supabase = createClient()
      const { error } = await supabase.from("assets").insert(validated.data)

      if (error) throw error

      onOpenChange(false)
      setFormState({})
      toast.success("Asset created successfully!")
    } catch (err) {
      showErrorToast(NormalizeError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="flex flex-col">
        <Dialog.Header>
          <Dialog.Title>Create Asset</Dialog.Title>
        </Dialog.Header>

        <form id="create-asset" onSubmit={handleSubmit}>
          <SchemaForm<AssetFormState>
            blueprint={assetBlueprint}
            formState={formState}
            onChange={handleChange}
          />
        </form>

        <Dialog.Footer className="sticky bottom-0 bg-card/0">
          <Button type="submit" form="create-asset" disabled={isSubmitting}>
            <Save />Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}
