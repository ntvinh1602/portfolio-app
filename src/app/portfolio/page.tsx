"use client"

import { AppSidebar } from "@/components/nav-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import HoldingTable from "@/components/holding-table"
import { Piechart } from "@/components/piechart"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/supabaseClient"

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
        <SiteHeader title="Portfolio"/>
        <div className="w-full max-w-5xl grid grid-cols-2 p-2 gap-2 xl:grid-cols-3 xl:p-4 xl:gap-4 xl:mx-auto">
          <div className="col-span-2 xl:col-span-1">
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
            <HoldingTable />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
