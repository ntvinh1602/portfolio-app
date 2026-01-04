import * as Card from "@/components/ui/card"
import Image from "next/image"
import { Tables } from "@/types/database.types"
import { Info } from "lucide-react"
import { EditAssetForm } from "./form/edit-asset"

export function AssetInfo({
  asset,
  onDeleted,
}: {
  asset: Tables<"assets"> | null
  onDeleted?: () => void
}) {

  if (!asset) {
    return (
      <Card.Root variant="glow">
        <Card.Header>
          <Card.Title className="text-xl">Information</Card.Title>
          <Card.Action>
            <Info className="text-muted-foreground"/>
          </Card.Action>
        </Card.Header>
        <Card.Content className="flex justify-center">
          <span className="font-thin text-muted-foreground">No asset selected</span>
        </Card.Content>
      </Card.Root>
    )
  }

  return (
    <Card.Root variant="glow">
      <Card.Header>
        <Card.Title className="text-xl">{asset.name}</Card.Title>
        <Card.Subtitle>
          {asset.asset_class?.replace(/\b\w/g, (c) => c.toUpperCase())}
        </Card.Subtitle>
        <Card.Action>
          <div className="size-10 flex-shrink-0 rounded-full bg-background flex items-center justify-center overflow-hidden">
            <Image
              src={asset.logo_url || ""}
              alt={asset.ticker}
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
        </Card.Action>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
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
        
      </Card.Content>
    </Card.Root>
  )
}
