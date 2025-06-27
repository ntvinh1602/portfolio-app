"use client"

import { AppSidebar } from "@/components/nav-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AssetTable } from "@/components/asset-table"
import { Piechart } from "@/components/piechart"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState, useCallback } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"

interface SummaryItem {
  type: string;
  totalAmount: number;
}

interface AssetSummaryData {
  displayCurrency: string;
  assets: SummaryItem[];
  totalAssets: number;
  liabilities: SummaryItem[];
  totalLiabilities: number;
  equity: SummaryItem[];
  totalEquity: number;
}

export default function Page() {
  const [summaryData, setSummaryData] = useState<AssetSummaryData | null>(null);

  const fetchAssets = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_asset_summary');

    if (error) {
      console.error('Error fetching asset summary:', error);
      return;
    }

    if (data) {
      setSummaryData(data as AssetSummaryData);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets])

  const displayCurrency = summaryData?.displayCurrency || "USD"

  const assetsItems = (summaryData?.assets || []).map((item) => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount, displayCurrency),
  }))
  const assetsTotalAmount = formatCurrency(summaryData?.totalAssets || 0, displayCurrency)

  const liabilitiesItems = (summaryData?.liabilities || []).map((item) => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount, displayCurrency),
  }))
  const liabilitiesTotalAmount = formatCurrency(summaryData?.totalLiabilities || 0, displayCurrency)

  const equityItems = (summaryData?.equity || []).map((item) => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount, displayCurrency),
  }))
  const equityTotalAmount = formatCurrency(summaryData?.totalEquity || 0, displayCurrency)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Assets"/>
        <div className="w-full max-w-5xl grid grid-cols-2 p-2 gap-2 xl:grid-cols-3 xl:mx-auto">
          <div className="col-span-2 xl:col-span-1">
            <Card className="flex flex-col gap-0 py-4 pb-0">
              <CardHeader className="items-center pb-0 gap-0">
                <CardTitle className="text-lg font-semibold">
                  Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                <Piechart data={summaryData?.assets} />
              </CardContent>
            </Card>
          </div>
          <div className="col-span-2">     
            <Card className="flex flex-col py-4 gap-4">
              <h1 className="text-lg font-semibold px-6">
                Balance Sheet
              </h1>
              <CardHeader>
                <CardTitle>Total Assets</CardTitle>
                <CardDescription>Assets by investment type</CardDescription>
              </CardHeader>
              <CardContent>
                <AssetTable items={assetsItems} totalAmount={assetsTotalAmount} tableHeader="Assets" />
              </CardContent>
              <div className="px-6">
                <Separator />
              </div>
              <CardHeader>
                <CardTitle>Total Liabilities</CardTitle>
                <CardDescription>Assets by funding origins</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <AssetTable items={liabilitiesItems} totalAmount={liabilitiesTotalAmount} tableHeader="Liabilities" />
                <AssetTable items={equityItems} totalAmount={equityTotalAmount} tableHeader="Equity" />
              </CardContent>
            </Card>
          </div>          
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}