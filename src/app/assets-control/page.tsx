"use client"

import * as React from "react"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { columns } from "./components/columns"
import { useTransactionFormData } from "@/hooks/useTransactionFormData"
import { Assets } from "./components/table"
import { Separator } from "@/components/ui/separator"
import { AssetDetails } from "./components/details"
import { Tables } from "@/types/database.types"
import { TabSwitcher } from "@/components/tab-switcher"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateAssetForm } from "./components/create-asset-form"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabaseClient"
import { mutate } from "swr"

export default function Page() {
  const isMobile = useIsMobile()
  const { assets, loading } = useTransactionFormData(true)
  const [category, setCategory] = React.useState("stock")
  const [selectedAsset, setSelectedAsset] =
    React.useState<Tables<"assets"> | null>(null)
  const [isCreateAssetDialogOpen, setIsCreateAssetDialogOpen] =
    React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleAssetSelect = async (asset: Tables<"assets">) => {
    setSelectedAsset(asset)
  }

  const handleCreateAssetSubmit = async (formData: Omit<Partial<Tables<"assets">>, "id">) => {
    setIsSaving(true)

    const { data: inserted, error } = await supabase
      .from("assets")
      .insert({
        ticker: formData.ticker,
        name: formData.name,
        asset_class: formData.asset_class,
        currency_code: formData.currency_code,
        logo_url: formData.logo_url,
      })
      .select()
      .single()

    if (error) {
      setIsSaving(false)
      toast.error("Failed to create asset.")
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
    setIsCreateAssetDialogOpen(false)
    setSelectedAsset(inserted) // auto-select new asset
    toast.success("Asset created successfully!")
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Assets Control" />
        <Separator className="mb-4" />
        <div className="flex gap-4 flex-1 overflow-hidden w-7/10 mx-auto">
          <div className="flex w-6/10 flex-col gap-2">
            <div className="flex justify-between items-center">
              <Dialog
                open={isCreateAssetDialogOpen}
                onOpenChange={setIsCreateAssetDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="default">
                    <Plus />
                    Create Asset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Asset</DialogTitle>
                  </DialogHeader>
                  <CreateAssetForm
                    onSubmit={handleCreateAssetSubmit}
                    isSaving={isSaving}
                  />
                </DialogContent>
              </Dialog>
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
            <AssetDetails
              asset={selectedAsset}
              onDeleted={() => setSelectedAsset(null)}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
