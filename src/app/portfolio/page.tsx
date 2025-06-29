"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/utils"
import { PageInfo } from "@/components/page-info"
import { StockCardWrapper } from "@/components/stock-card-wrapper"

interface StockHolding {
  ticker: string;
  name: string;
  logo_url: string;
  total_amount: number;
  quantity: number;
  pnl: string;
}

export default function Page() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  useEffect(() => {
    async function fetchStockHoldings() {
      const { data, error } = await supabase.rpc('get_stock_holdings');
      if (error) {
        console.error('Error fetching stock holdings:', error);
      } else {
        setStockHoldings(data || []);
      }
    }

    fetchStockHoldings();
  }, [])

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
        <div className="flex flex-col gap-2 px-4 max-w-4xl xl:mx-auto w-full">
          {stockHoldings.map((stock) => (
            <StockCardWrapper
              key={stock.ticker}
              ticker={stock.ticker}
              name={stock.name}
              logoUrl={stock.logo_url}
              quantity={stock.quantity}
              totalAmount={stock.total_amount}
              pnl={stock.pnl}
            />
          ))}
        </div>
        <div className="space-y-4">
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}