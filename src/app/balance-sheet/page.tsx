"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AssetTable } from "@/components/asset-table"
import { Piechart } from "@/components/piechart"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"
import { PageInfo } from "@/components/page-info"

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
  const [isInfoOpen, setIsInfoOpen] = useState(false)

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
        <SiteHeader title="Balance Sheet" onInfoClick={() => setIsInfoOpen(true)} />
        <PageInfo
          open={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          title="Understand your Balance Sheet"
        >
          <p className="text-justify">Balance Sheet gives you a complete financial snapshot of your investments. It shows you two important sides of the same coin: <b>Assets</b> and <b>Liabilities</b>.
          <br/><br/>
          <b>Total Assets: What you own.</b> This tab lists all the valuable things in your portfolio, such as cash and stocks.
          <br/><br/>
          <b>Total Liabilities: Where the money came from.</b> This tab shows how your assets were funded.
          <br/><br/>
          <b>Liabilities</b> is what you owe, this is the portion of your portfolio funded by borrowed money, such as bank loans or margin loans from your broker.
          <br/><br/>
          <b>Equities</b> is what you truly own. It represents your personal stake and include two parts: <b>Paid-in Capital</b> - money contributed from your own pocket and <b>Retained Earnings</b> - profits your investments generated.
          <br/><br/>
          The fundamental rule is that everything must balance out:</p>
          <br/>
          <p className="text-center"><b>Total Assets = Liabilities + Equity</b></p>
          <br/>
          <p className="text-justify">By looking at both sides, you can see not just what you have, but how you're building it. Your <b>Equity</b> is your true net worth within this portfolio, and watching it grows is the ultimate goal.
          </p>
        </PageInfo>
        <Tabs className="px-4 max-w-4xl xl:mx-auto w-full" defaultValue="assets">
          <TabsList className="w-full h-10">
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
            <div className="flex flex-col gap-4">
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
            </div>
          </TabsContent>
        </Tabs>
      </SidebarInset>
    </SidebarProvider>
  )
}