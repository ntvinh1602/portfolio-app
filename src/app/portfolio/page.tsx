"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState } from "react"
import { StockCardWrapper } from "@/components/stock/stock-card-wrapper"
import { StockSkeleton } from "@/components/stock/stock-layout"
import {
  CardAction,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { 
  Bitcoin,
  ReceiptText,
  RefreshCw,
  ChartPie
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Piechart } from "@/components/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"

interface StockHoldingBase {
  ticker: string;
  name: string;
  logo_url: string;
  quantity: number;
  cost_basis: number;
  last_updated_price: number;
}

interface StockHolding extends StockHoldingBase {
  total_amount: number;
}

export default function Page() {
  const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([])
  const [loading, setLoading] = useState(true)
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
      } else if (data) {
        const holdingsWithTotalAmount: StockHolding[] = (data as StockHoldingBase[]).map((holding: StockHoldingBase) => ({
          ...holding,
          total_amount: holding.quantity * holding.last_updated_price,
        }));
        setStockHoldings(holdingsWithTotalAmount);
      }
      setLoading(false)
    }

    fetchInitialData();
  }, [])

  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      allocation: {
        label: "Allocation",
      },
    };
    const activeHoldings = stockHoldings.filter(item => item.total_amount > 0);
    activeHoldings.forEach((item, index) => {
      config[item.ticker] = {
        label: item.ticker,
        color: `var(--chart-${(index % 5) + 1})`,
      };
    });
    return config;
  }, [stockHoldings]);

  const chartData = React.useMemo(() => {
    return stockHoldings
      ?.filter(item => item.total_amount > 0)
      .map(item => ({
        asset: item.ticker,
        allocation: item.total_amount,
        fill: `var(--color-${item.ticker})`,
      }));
  }, [stockHoldings]);

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
          <CardAction className="flex py-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <ChartPie />Chart
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                className="border-border/50 rounded-4xl bg-card/25 backdrop-blur-sm"
              >
                <Piechart 
                  data={chartData}
                  chartConfig={chartConfig}
                  dataKey="allocation"
                  nameKey="asset"
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              onClick={handleRefresh}
            >
              <RefreshCw />Refresh
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