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

  if (!asset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Asset Information</CardTitle>
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
        <CardTitle className="text-xl">Asset Information</CardTitle>
        <CardDescription className="text-xs">{asset.id}</CardDescription>
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
          onSuccess={(updated) => {
            onUpdated?.(updated) // notify parent if needed
          }}
          onDeleted={() => {
            onDeleted?.()
          }}
        />
      </CardContent>
    </Card>
  )
}
