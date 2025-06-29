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
import { PageInfo } from "@/components/page-info"
import { StockCardWrapper } from "@/components/stock-card-wrapper"

interface StockHolding {
  ticker: string;
  name: string;
  logo_url: string;
  total_amount: number;
  quantity: number;
  cost_basis: number;
  last_updated_price: number;
}

export default function Page() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const handleRefresh = async () => {
    setRefreshKey(prevKey => prevKey + 1)
    const newTimestamp = new Date()
    setLastUpdated(newTimestamp)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ last_stock_fetching: newTimestamp.toISOString() })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating last_stock_fetching:', error)
      }
    }
  }

  useEffect(() => {
    async function fetchInitialData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('last_stock_fetching')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
        } else if (profile?.last_stock_fetching) {
          setLastUpdated(new Date(profile.last_stock_fetching))
        }
      }

      const { data, error } = await supabase.rpc('get_stock_holdings');
      if (error) {
        console.error('Error fetching stock holdings:', error);
      } else {
        setStockHoldings(data || []);
      }
    }

    fetchInitialData();
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
        <SiteHeader title="Portfolio" onInfoClick={() => setIsInfoOpen(true)} onRefresh={handleRefresh} />
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
              costBasis={stock.cost_basis}
              refreshKey={refreshKey}
              lastUpdatedPrice={stock.last_updated_price}
            />
          ))}
          {lastUpdated && (
            <span className="text-right text-xs px-6 text-muted-foreground italic">
              Last updated at {lastUpdated.toLocaleString(
                'en-SG',
                { 
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}
            </span>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}