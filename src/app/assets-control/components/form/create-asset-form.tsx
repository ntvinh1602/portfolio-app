"use client"

import * as React from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabaseClient"
import { Tables } from "@/types/database.types"
import { AssetFormBase } from "./base-form"
import { useAssetForm } from "../../hooks/useAssetForm"
import { refreshData } from "../../../../lib/refresh"

type NewAsset = Omit<Partial<Tables<"assets">>, "id">

export function CreateAssetForm({
  onSuccess,
}: {
  onSuccess?: (asset: Tables<"assets">) => void
}) {
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSubmit = async (formData: NewAsset) => {
    setIsSaving(true)

    const { data: inserted, error } = await supabase
      .from("assets")
      .insert({
        ticker: formData.ticker,
        name: formData.name,
        asset_class: formData.asset_class,
        currency_code: formData.currency_code,
        logo_url: formData.logo_url,
        is_active: formData.is_active
      })
      .select()
      .single()

    if (error) {
      toast.error("Failed to create asset.")
      setIsSaving(false)
      return
    }

    await refreshData("account", "api/gateway/account-data")
    toast.success("Asset created successfully!")
    setIsSaving(false)
    onSuccess?.(inserted)
  }

  // ✅ hook handles event wrapping (FormEvent → formData)
  const { formData, handleChange, handleSubmit: handleFormSubmit } = useAssetForm<NewAsset>(
    {},
    handleSubmit,
    false
  )

  return (
    <AssetFormBase
      formData={formData}
      handleChange={handleChange}
      handleSubmit={handleFormSubmit} // correct signature now
      isSaving={isSaving}
      submitLabel="Create"
    />
  )
}

