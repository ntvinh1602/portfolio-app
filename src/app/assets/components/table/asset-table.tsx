"use client"

import { ReactNode, useState, useMemo, useCallback } from "react"
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
  children: ReactNode
}) {
  const [category, setCategory] = useState<"stock" | "other">("stock")
  const [selectedAsset, setSelectedAsset] =
    useState<Tables<"assets"> | null>(null)

  const assetCounts = useMemo(() => {
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

  const filteredData = useMemo(() => {
    if (category === "stock") {
      return data.filter((t) => ["stock"].includes(t.asset_class))
    }
    return data.filter((t) => !["stock"].includes(t.asset_class))
  }, [data, category])

  const handleRowClick = useCallback(
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
          triggerClassName="w-40 h-10"
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
        defaultSorting={[{ id: "ticker", desc: false }]}
      />
    </div>
  )
}
