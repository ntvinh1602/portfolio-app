"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState } from "react"
import { StockCardWrapper } from "@/components/portfolio/stock-card-wrapper"
import { StockSkeleton } from "@/components/portfolio/stock-layout"
import {
  CardAction,
  CardContent,
  CardHeader,
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
    <PageMain>
      <PageHeader title="Portfolio" />
      <PageContent>
        <CardHeader className="flex px-0 items-center justify-between">
          <Button
            variant="default"
            className="font-semibold text-md"
          >
            <ReceiptText />Stocks
          </Button>
          <CardAction className="flex py-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
            >
              <RefreshCw />Refresh Data
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-4">
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
        <CardHeader className="flex px-0 items-center justify-between">
          <Button
            variant="default"
            className="font-semibold text-md"
          >
            <Bitcoin />Crypto
          </Button>
        </CardHeader>
      </PageContent>
    </PageMain>
  )
}