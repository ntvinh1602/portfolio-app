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
import { StockSkeleton } from "@/components/stock-skeleton"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Bitcoin,
  ReceiptText,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([])
  const [loading, setLoading] = useState(true)
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
      setLoading(false)
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
        <SiteHeader title="Portfolio" onInfoClick={() => setIsInfoOpen(true)} />
        <PageInfo
          open={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          title="What is in your Portfolio?"
        >
          <p className="text-justify">All of your tradable securities will be displayed here under Portfolio. Currently it only includes stocks from Vietnamese listed companies and cryptocurrencies, but can be expanded in the future.
          </p>
        </PageInfo>
        <Card className="bg-background shadow-none border-none gap-2 px-4 py-2 w-full max-w-4xl xl:mx-auto">
          <CardHeader className="flex px-2 items-center justify-between">
            <Button
              variant="default"
              className="rounded-full font-semibold border-none"
            >
              <ReceiptText className="size-4"/>Stocks
            </Button>
            <CardAction className="flex py-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="rounded-full"
              >
                <RefreshCw className="size-4"/>
                Refresh Data
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <div className="flex flex-col gap-2">
              {loading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <StockSkeleton key={index} />
                ))
              ) : stockHoldings.length > 0 ? (
                stockHoldings.map((stock) => (
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
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No stock holdings found.
                </div>
              )}
              {lastUpdated && !loading && stockHoldings.length > 0 && (
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
          </CardContent>
        </Card>
        <Card className="bg-background shadow-none border-none gap-2 px-4 py-2 max-w-4xl xl:mx-auto w-full">
          <CardHeader className="flex px-2 items-center justify-between">
            <Button
              variant="default"
              className="rounded-full w-fit font-semibold border-none"
            >
              <Bitcoin className="size-4"/>Crypto
            </Button>
          </CardHeader>
        </Card>
      </SidebarInset>
    </SidebarProvider>
  )
}