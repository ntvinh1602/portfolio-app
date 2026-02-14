"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { useAssets } from "@/hooks/useAssets"
import { Separator } from "@/components/ui/separator"
import { Tables } from "@/types/database.types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateAssetForm } from "./components/form/create-asset"
import { AssetInfo } from "./components/asset-info"
import { AssetTable } from "./components/table/asset-table"

export default function Page() {
  const { assetData, isLoading } = useAssets()
  const [selectedAsset, setSelectedAsset] = useState<Tables<"assets"> | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAssetSelect = async (asset: Tables<"assets"> | null) => {
    if (!asset) setSelectedAsset(null)
      else setSelectedAsset(asset)
  }

  return (
    <div>
      <Header title="Assets" />
      <Separator className="mb-4" />
      <div className="flex gap-4 flex-1 overflow-hidden w-7/10 mx-auto">
        <div className="flex w-6/10 flex-col gap-2">
          <AssetTable
            data={assetData}
            loading={isLoading}
            onAssetSelect={handleAssetSelect}
          >
            <Button
              variant="default"
              onClick={() => setIsDialogOpen(true)}>
              <Plus/>Asset
            </Button>
          </AssetTable>
        </div>
        <div className="flex w-4/10 flex-col gap-2">
          <AssetInfo
            asset={selectedAsset}
            onDeleted={() => setSelectedAsset(null)}
          />
        </div>
      </div>
    
      <CreateAssetForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
