"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { useAccountData } from "@/hooks/useAccountData"
import { Separator } from "@/components/ui/separator"
import { Tables } from "@/types/database.types"
import { TabSwitcher } from "@/components/tab-switcher"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateAssetForm } from "./components/form/create-asset"
import { columns } from "./components/table/columns"
import { Assets } from "./components/table/table"
import { InfoCard } from "./components/info-card"

export default function Page() {
  const { assets, loading } = useAccountData()
  const [category, setCategory] = React.useState("stock")
  const [selectedAsset, setSelectedAsset] =
    React.useState<Tables<"assets"> | null>(null)
  const [isCreateAssetDialogOpen, setIsCreateAssetDialogOpen] =
    React.useState(false)

  const handleAssetSelect = async (asset: Tables<"assets">) => {
    if (selectedAsset === asset) setSelectedAsset(null)
    else setSelectedAsset(asset)
  }

  const assetCounts = React.useMemo(() => {
    return assets.reduce(
      (acc, asset) => {
        if (asset.asset_class === "stock") {
          acc.stock += 1
        } else {
          acc.others += 1
        }
        return acc
      },
      { stock: 0, others: 0 }
    )
  }, [assets])

  return (
    <div>
      <Header title="Assets" />
      <Separator className="mb-4" />
      <div className="flex gap-4 flex-1 overflow-hidden w-7/10 mx-auto">
        <div className="flex w-6/10 flex-col gap-2">
          <div className="flex justify-between items-center">
            <Button
              variant="default"
              onClick={() => setIsCreateAssetDialogOpen(true)}>
              <Plus/>Asset
            </Button>
            <TabSwitcher
              variant="content"
              value={category}
              onValueChange={setCategory}
              options={[
                {
                  label: "Stocks",
                  value: "stock",
                  number: assetCounts.stock,
                },
                {
                  label: "Others",
                  value: "others",
                  number: assetCounts.others,
                },
              ]}
            />
          </div>
          <Assets
            columns={columns}
            data={assets}
            category={category}
            onRowClick={handleAssetSelect}
            selectedAsset={selectedAsset}
            loading={loading}
          />
        </div>
        <div className="flex w-4/10 flex-col gap-2">
          <InfoCard
            asset={selectedAsset}
            onDeleted={() => setSelectedAsset(null)}
          />
        </div>
      </div>
    
      <CreateAssetForm
        open={isCreateAssetDialogOpen}
        onOpenChange={setIsCreateAssetDialogOpen}
      />
    </div>
  )
}
