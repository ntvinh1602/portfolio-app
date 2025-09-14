"use client"

import * as React from "react"
import { Tables } from "@/types/database.types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabaseClient"
import { AssetFormBase } from "./base-form"
import { useAssetForm } from "../../hooks/useAssetForm"
import { revalidateAndMutate } from "../../lib/revalidate"

export function UpdateAssetForm({
  initialData,
  onSuccess,
  onDeleted,
  isSaving = false,
  isDeleting = false,
}: {
  initialData: Tables<"assets">
  onSuccess?: (asset: Tables<"assets">) => void
  onDeleted?: () => void
  isSaving?: boolean
  isDeleting?: boolean
}) {
  // 🔑 Update handler
  const handleUpdate = async (formData: Tables<"assets">) => {
    const { error } = await supabase
      .from("assets")
      .update({
        ticker: formData.ticker,
        name: formData.name,
        asset_class: formData.asset_class,
        currency_code: formData.currency_code,
        logo_url: formData.logo_url,
      })
      .eq("id", formData.id)

    if (error) {
      toast.error("Failed to save asset details.")
      return
    }

    await revalidateAndMutate()
    toast.success("Asset details saved successfully!")
    onSuccess?.(formData)
  }

  // 🔑 Delete handler
  const handleDelete = async (formData: Tables<"assets">) => {
    const { error } = await supabase.from("assets").delete().eq("id", formData.id)

    if (error) {
      toast.error("Failed to delete asset.")
      return
    }

    await revalidateAndMutate()
    toast.success("Asset deleted successfully!")
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
