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
} from "@/components/ui/card"

interface SummaryItem {
  type: string;
  totalAmount: number;
}

export interface AssetSummaryData {
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
        <div className="grid grid-cols-2 p-2 gap-2 xl:grid-cols-3 xl:p-4 xl:gap-4">
          <div className="col-span-2 lg:col-span-1">
            <Card className="flex flex-col gap-0">
              <CardHeader className="items-center pb-0">
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
            <AssetTable data={summaryData} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}