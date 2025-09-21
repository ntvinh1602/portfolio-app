"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { assetBlueprint } from "./blueprints"
import { preparePayload } from "./prepare-payload"
import { SchemaForm } from "@/components/form/schemaForm"
import { assetSchema } from "@/app/assets/components/form/schema"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { refreshData } from "@/lib/refresh"
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
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formState, setFormState] = React.useState<AssetFormState>({})

  const handleChange = React.useCallback(
    <K extends keyof AssetFormState & string>(
      name: K,
      value: string | undefined
    ) => {
      setFormState((prev) => ({ ...prev, [name]: value }))
    }, []
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = preparePayload(formState)
      const validated = assetSchema.safeParse(payload)

      if (!validated.success) throw validated.error

      const supabase = await createClient()
      const { error } = await supabase.from("assets").insert(validated.data)

      if (error) throw error

      onOpenChange(false)
      setFormState({})
      await refreshData("account", "/api/gateway/account-data")
      toast.success("Asset created successfully!")
    } catch (err) {
      showErrorToast(NormalizeError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Asset</DialogTitle>
        </DialogHeader>

        <form id="create-asset" onSubmit={handleSubmit}>
          <SchemaForm<AssetFormState>
            blueprint={assetBlueprint}
            formState={formState}
            onChange={handleChange}
          />
        </form>

        <DialogFooter className="sticky bottom-0 bg-card/0">
          <Button type="submit" form="create-asset" disabled={isSubmitting}>
            <Save />Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
