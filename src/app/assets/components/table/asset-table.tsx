"use client"

import * as React from "react"
import { TabSwitcher } from "@/components/tab-switcher"
import { DataTable } from "@/components/table/data-table"
import { columns } from "./columns"
import { Tables } from "@/types/database.types"

export function AssetTable({
  data,
  loading,
  onAssetSelect,
  children,
}: {
  data: Tables<"assets">[]
  loading: boolean
  onAssetSelect: (asset: Tables<"assets"> | null) => void
  children: React.ReactNode
}) {
  const [category, setCategory] = React.useState<"stock" | "other">("stock")
  const [selectedAsset, setSelectedAsset] =
    React.useState<Tables<"assets"> | null>(null)

  const assetCounts = React.useMemo(() => {
    return data.reduce(
      (acc, asset) => {
        if (asset.asset_class === "stock") {
          acc.stock += 1
        } else {
          acc.other += 1
        }
        return acc
      },
      { stock: 0, other: 0 }
    )
  }, [data])

  const filteredData = React.useMemo(() => {
    if (category === "stock") {
      return data.filter((t) => ["stock"].includes(t.asset_class))
    }
    return data.filter((t) => !["stock"].includes(t.asset_class))
  }, [data, category])

  const handleRowClick = React.useCallback(
    (asset: Tables<"assets">) => {
      if (selectedAsset && selectedAsset.id === asset.id) {
        setSelectedAsset(null)
        onAssetSelect(null)
      } else {
        setSelectedAsset(asset)
        onAssetSelect(asset)
      }
    },
    [selectedAsset, onAssetSelect]
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        {children}
        <TabSwitcher
          variant="content"
          value={category}
          onValueChange={(value) => setCategory(value as "stock" | "other")}
          options={[
            { label: "Stocks", value: "stock", number: assetCounts.stock },
            { label: "Others", value: "other", number: assetCounts.other },
          ]}
        />
      </div>
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        selectedRow={selectedAsset}
        onRowClick={handleRowClick}
        rowId={(row) => row.id}
        noDataMessage="No transactions found."
      />
    </div>
  )
}
