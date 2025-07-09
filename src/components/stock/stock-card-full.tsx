"use client"

import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  RefreshCw,
  FileChartPie
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { useStockHoldings } from "@/hooks/useStockHoldings"
import {
  StockItemWrapper,
  StockSkeleton
} from "@/components/stock/stock-layout"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useCallback, useEffect, useState } from "react"

export function StockCardFull() {
  const { stockHoldings, loading } = useStockHoldings()
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pendingRefreshes, setPendingRefreshes] = useState(0);

  const handleRefresh = () => {
    setPendingRefreshes(stockHoldings.length);
    setRefreshKey(prevKey => prevKey + 1);
  };

  const updateLastFetchedTimestamp = useCallback(async (timestamp: Date) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ last_stock_fetching: timestamp.toISOString() })
        .eq('id', user.id);
    }
  }, []);

  const handleRefreshComplete = useCallback(() => {
    setPendingRefreshes(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        const newTimestamp = new Date();
        setLastUpdated(newTimestamp);
        updateLastFetchedTimestamp(newTimestamp);
      }
      return newCount;
    });
  }, [updateLastFetchedTimestamp]);

  useEffect(() => {
    async function fetchLastUpdated() {
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
    }

    fetchLastUpdated();
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
    <Card className="bg-muted/50 shadow-none gap-4 pb-0">
      <CardHeader>
        <CardTitle>Stocks</CardTitle>
        <CardDescription>
          Built on fundamentals
        </CardDescription>
        <CardAction className="flex gap-6">
          <Popover>
            <PopoverTrigger>
              <FileChartPie />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="border-border/50 rounded-4xl bg-card/25 backdrop-blur-sm"
            >
              <Piechart 
                data={chartData}
                chartConfig={chartConfig}
                dataKey="allocation"
                nameKey="asset"
                legend="bottom"
              />
            </PopoverContent>
          </Popover>
          {
            pendingRefreshes > 0
              ? 'Refreshing...' 
              : <RefreshCw onClick={handleRefresh} />
          }
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="flex flex-col gap-0">
          {loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <StockSkeleton key={index} />
            ))
          ) : stockHoldings.length > 0 ? (
            stockHoldings.map((stock) => (
              <StockItemWrapper
                key={stock.ticker}
                ticker={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                quantity={stock.quantity}
                costBasis={stock.cost_basis}
                refreshKey={refreshKey}
                lastUpdatedPrice={stock.latest_price}
                onRefreshComplete={handleRefreshComplete}
              />
            ))
          ) : (
            <div className="text-center text-muted-foreground py-4">
              No stock holdings found.
            </div>
          )}
          {lastUpdated && !loading && stockHoldings.length > 0 && (
            <span className="text-right text-xs px-4 italic py-2 text-muted-foreground">
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
  )
}