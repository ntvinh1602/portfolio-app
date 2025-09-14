"use client"

import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { NotepadText } from "lucide-react"
import Image from "next/image"
import { Tables } from "@/types/database.types"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabaseClient"
import { mutate } from "swr"
import { UpdateAssetForm } from "./update-asset-form"

export function AssetDetails({
  asset,
  onDeleted
}: {
  asset: Tables<"assets"> | null,
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
      })
      .eq("id", formData.id)

    if (error) {
      setIsSaving(false)
      toast.error("Failed to save asset details.")
      return
    }

    // 🔑 Revalidate caches
    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-token": process.env.NEXT_PUBLIC_REVALIDATION_TOKEN!,
        "x-table-name": "transaction_legs",
      },
    })

    await mutate("/api/gateway/transaction-form")

    setIsSaving(false)
    toast.success("Asset details saved successfully!")
  }

  const handleDelete = async (formData: Tables<"assets">) => {
    setIsDeleting(true)

    const { error } = await supabase
      .from("assets")
      .delete()
      .eq("id", formData.id)

    if (error) {
      setIsDeleting(false)
      toast.error("Failed to delete asset.")
      return
    }

    // 🔑 Revalidate caches
    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-secret-token": process.env.NEXT_PUBLIC_REVALIDATION_TOKEN!,
        "x-table-name": "transaction_legs",
      },
    })

    await mutate("/api/gateway/transaction-form")

    setIsDeleting(false)
    toast.success("Asset deleted successfully!")

    // notify parent if provided
    if (onDeleted) {
      onDeleted()
    }
  }

  if (!asset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Asset</CardTitle>
          <CardAction>
            <NotepadText className="stroke-1 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex justify-center">
          <span className="font-thin">No asset selected</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>{asset.ticker}</CardDescription>
        <CardTitle className="text-xl">{asset.name}</CardTitle>
        <CardAction>
          <div className="size-10 flex-shrink-0 rounded-full bg-background flex items-center justify-center overflow-hidden">
            <Image
              src={asset.logo_url || ""}
              alt={asset.ticker}
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <UpdateAssetForm
          initialData={asset}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onSubmit={handleUpdate}
          onDelete={handleDelete}
        />
      </CardContent>
    </Card>
  )
}
