"use client"

import * as React from "react"
import { Tables } from "@/types/database.types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabaseClient"
import { AssetFormBase } from "./base-form"
import { useAssetForm } from "../../hooks/useAssetForm"
import { refreshData } from "../../lib/revalidate"

export function UpdateAssetForm({
  initialData,
  onSuccess,
  onDeleted,
}: {
  initialData: Tables<"assets">
  onSuccess?: (asset: Tables<"assets">) => void
  onDeleted?: () => void
}) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleUpdate = async (formData: Tables<"assets">) => {
    setIsSaving(true)
    const { error } = await supabase
      .from("assets")
      .update({
        ticker: formData.ticker,
        name: formData.name,
        asset_class: formData.asset_class,
        currency_code: formData.currency_code,
        logo_url: formData.logo_url,
        is_active: formData.is_active,
      })
      .eq("id", formData.id)

    if (error) {
      toast.error("Failed to save asset details.")
      setIsSaving(false)
      return
    }

    await refreshData()
    toast.success("Asset details saved successfully!")
    setIsSaving(false)
    onSuccess?.(formData)
  }

  const handleDelete = async (formData: Tables<"assets">) => {
    setIsDeleting(true)
    const { error } = await supabase.from("assets").delete().eq("id", formData.id)

    if (error) {
      toast.error("Failed to delete asset.")
      setIsDeleting(false)
      return
    }

    await refreshData()
    toast.success("Asset deleted successfully!")
    setIsDeleting(false)
    onDeleted?.()
  }

  // ✅ Hook manages state + event bridging
  const { formData, handleChange, handleSubmit } = useAssetForm<Tables<"assets">>(
    initialData,
    handleUpdate,
    true // editing mode
  )

  return (
    <AssetFormBase
      formData={formData}
      handleChange={handleChange}
      handleSubmit={handleSubmit}
      isSaving={isSaving}
      submitLabel="Update"
      deleteConfig={{
        onDelete: () => handleDelete(formData),
        isDeleting,
        entityName: formData.ticker,
      }}
    />
  )
}
