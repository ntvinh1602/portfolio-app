"use client"

import * as React from "react"
import { toast } from "sonner"
import { assetBlueprint } from "./blueprints"
import { preparePayload } from "./prepare-payload"
import { SchemaForm } from "@/components/form/schemaForm"
import { assetSchema } from "@/app/assets/components/form/schema"
import { createClient } from "@/lib/supabase/client"
import { refreshData } from "@/lib/refresh"
import { NormalizeError } from "@/lib/error"
import { showErrorToast } from "@/components/error-toast"
import { Tables } from "@/types/database.types"
import { Button } from "@/components/ui/button"
import { Save, Shredder } from "lucide-react"
import { Card, CardFooter } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirmation"

function mapAssetToFormState(asset: Tables<"assets">) {
  const form: Partial<Record<keyof typeof asset, string>> = {}
  for (const key in asset) {
    const value = asset[key as keyof typeof asset]
    form[key as keyof typeof asset] =
      key === "is_active"
        ? value
          ? "true"
          : "false"
        : value != null
        ? String(value)
        : ""
  }
  return form
}

export function EditAssetForm({
  selectedAsset,
  onDeleted,
}: {
  selectedAsset: Tables<"assets">
  onDeleted: () => void
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [formState, setFormState] = React.useState(() =>
    selectedAsset ? mapAssetToFormState(selectedAsset) : {}
  )
  
  React.useEffect(() => {
    if (selectedAsset) {
      setFormState(mapAssetToFormState(selectedAsset))
    }
  }, [selectedAsset])

  const handleChange = (name: string, value: string | undefined) => {
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = preparePayload(formState)
      const validated = assetSchema.safeParse(payload)

      if (!validated.success) throw validated.error

      const supabase = createClient()
      const { error } = await supabase
        .from("assets")
        .update(validated.data)
        .eq("id", selectedAsset.id)

      if (error) throw error

      await refreshData("account", "/api/gateway/account-data")
      toast.success("Asset updated successfully!")
    } catch (err) {
      showErrorToast(NormalizeError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedAsset) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", selectedAsset.id)

      if (error) throw error

      toast.success("Asset deleted successfully!")
      setFormState({}) // reset form state
      await refreshData("account", "/api/gateway/account-data")
      if (onDeleted) onDeleted()
    } catch (err) {
      showErrorToast(NormalizeError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-0 border-0 flex gap-3">
      <form id="edit-asset" onSubmit={handleEdit}>
        <SchemaForm
          blueprint={assetBlueprint}
          formState={formState}
          onChange={handleChange}
        />
      </form>
      <CardFooter className="flex justify-end gap-2 px-0">
        <ConfirmDialog
          message="Selected asset will be deleted. This action cannot be undone."
          onConfirm={handleDelete}
        >
          <Button variant="destructive" disabled={isSubmitting}>
            <Shredder /> Delete
          </Button>
        </ConfirmDialog>
        <Button type="submit" form="edit-asset" disabled={isSubmitting}>
          <Save />Save
        </Button>
      </CardFooter>
    </Card>
  )
}

