"use client"

import * as React from "react"
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
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"

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
        <div className="w-full max-w-4xl p-2 xl:mx-auto">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs className="gap-4" defaultValue="assets">
                <TabsList className="w-full">
                  <TabsTrigger value="assets">Total Assets</TabsTrigger>
                  <TabsTrigger value="liabilities">Total Liabilities</TabsTrigger>
                </TabsList>
                <TabsContent value="assets">
                  <Piechart data={summaryData?.assets} />
                  <AssetTable
                    items={assetsItems}
                    totalAmount={assetsTotalAmount}
                    tableHeader="Assets"
                  />
                </TabsContent>
                <TabsContent value="liabilities">
                  <Piechart data={summaryData?.assets} />
                  <AssetTable
                    items={liabilitiesItems}
                    totalAmount={liabilitiesTotalAmount}
                    tableHeader="Liabilities"
                  />
                  <AssetTable
                    items={equityItems}
                    totalAmount={equityTotalAmount}
                    tableHeader="Equity"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}