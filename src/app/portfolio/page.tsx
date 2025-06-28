"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Piechart } from "@/components/piechart"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import { PageInfo } from "@/components/page-info"
import HoldingTable from "@/components/holding-table"

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
        <SiteHeader title="Portfolio" onInfoClick={() => setIsInfoOpen(true)} />
        <PageInfo
          open={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          title="What is in your Portfolio?"
        >
          <p className="text-justify">All of your tradable securities will be displayed here under Portfolio. Currently it only includes stocks from Vietnamese listed companies and cryptocurrencies, but can be expanded in the future.
          </p>
        </PageInfo>
        <div className="px-4 max-w-4xl xl:mx-auto w-full">
          <Piechart data={summaryData?.assets} />
          <HoldingTable />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}