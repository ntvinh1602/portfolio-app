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
import { UpdateAssetForm } from "./form/update-asset-form"

export function AssetDetails({
  asset,
  onDeleted,
  onUpdated,
}: {
  asset: Tables<"assets"> | null
  onDeleted?: () => void
  onUpdated?: (asset: Tables<"assets">) => void
}) {
  const [isSaving, setIsSaving] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

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
          onSuccess={(updated) => {
            setIsSaving(false)
            onUpdated?.(updated) // notify parent if needed
          }}
          onDeleted={() => {
            setIsDeleting(false)
            onDeleted?.()
          }}
        />
      </CardContent>
    </Card>
  )
}
