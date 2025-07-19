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
import { Piechart } from "@/components/charts/base-charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { useStockHoldings } from "@/hooks/useStockHoldings"
import {
  StockItem,
  StockSkeleton
} from "@/components/list-item/stock"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState } from "react"
import { mutate } from "swr"
import { formatNum } from "@/lib/utils"

export function StockCardFull() {
  const { stockHoldings, loading, error } = useStockHoldings()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetch('/api/external/refresh-all-stock-prices', { method: 'POST' });
    // Re-fetch the holdings data
    await mutate('/api/query/stock-holdings');
    setIsRefreshing(false)
    setLastUpdated(new Date());
  };

  useEffect(() => {
    async function fetchLastUpdated() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_stock_fetching')
          .eq('id', user.id)
          .single()
        if (profile?.last_stock_fetching) {
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
    <Card className="gap-4 pb-0">
      <CardHeader>
        <CardTitle>Stocks</CardTitle>
        <CardDescription>Built on fundamentals</CardDescription>
        <CardAction className="flex gap-6">
          <Popover>
            <PopoverTrigger>
              <FileChartPie className="stroke-[1]"/>
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
          {isRefreshing ? (
            <RefreshCw className="stroke-[1] animate-spin" />
          ) : (
            <RefreshCw
              className="stroke-[1]"
              onClick={handleRefresh}
            />
          )}
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
              <StockItem
                key={stock.ticker}
                ticker={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                quantity={formatNum(stock.quantity)}
                totalAmount={formatNum(stock.total_amount)}
                pnl={stock.cost_basis > 0 ? formatNum(((stock.total_amount / stock.cost_basis) - 1) * 100, 1) : "0.0"}
                price={formatNum(stock.latest_price / 1000, 2)}
                priceStatus="success"
                variant="full"
              />
            ))
          ) : (
            <div className="text-center font-thin text-muted-foreground py-4">
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