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
import { Info } from "lucide-react"
import { EditAssetForm } from "./form/edit-asset"

export function InfoCard({
  asset,
  onDeleted,
}: {
  asset: Tables<"assets"> | null
  onDeleted?: () => void
}) {

  if (!asset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Information</CardTitle>
          <CardAction>
            <Info className="text-muted-foreground"/>
          </CardAction>
        </CardHeader>
        <CardContent className="flex justify-center">
          <span className="font-thin text-muted-foreground">No asset selected</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{asset.name}</CardTitle>
        <CardDescription>
          {asset.asset_class?.replace(/\b\w/g, (c) => c.toUpperCase())}
        </CardDescription>
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
      <CardContent className="flex flex-col gap-3">
        <div className="h-9 grid grid-cols-4 items-center text-left text-foreground text-sm font-thin gap-2">
          <span>Asset ID</span>
          <span className="col-span-3">{asset.id}</span>
        </div>
        <div className="h-9 grid grid-cols-4 items-center text-left text-foreground text-sm font-thin gap-2">
          <span>Current Quantity</span>
          <span className="col-span-3">
            {asset.current_quantity} {
              asset.asset_class !== "stock"
                ? asset.currency_code
                : asset.current_quantity > 2
                  ? "shares"
                  : "share"
            }
          </span>
        </div>
        <EditAssetForm
          selectedAsset={asset}
          onDeleted={onDeleted || (() => {})}
        />
        
      </CardContent>
    </Card>
  )
}
