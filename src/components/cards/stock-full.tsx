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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useState } from "react"
import { mutate } from "swr"
import { formatNum } from "@/lib/utils"

import { Holding } from "@/hooks/useHoldings"

interface StockCardFullProps {
  stockHoldings: (Holding & { total_amount: number })[]
}

export function StockCardFull({ stockHoldings }: StockCardFullProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const loading = !stockHoldings
  const [showAuthAlert, setShowAuthAlert] = useState(false)

  const handleRefresh = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const isAnonymous = !user?.email

    if (isAnonymous) {
      setShowAuthAlert(true)
      return
    }

    setIsRefreshing(true)
    await fetch('/api/external/refresh-all-asset-prices', { method: 'POST' });
    // Re-fetch the holdings data
    await mutate('/api/gateway/holdings');
    setIsRefreshing(false)
  };

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
    <>
      <Card className="gap-3 py-0 border-0">
      <CardHeader className="px-0">
        <CardTitle>Stocks</CardTitle>
        <CardDescription>Built on fundamentals</CardDescription>
        <CardAction className="flex gap-6 self-center">
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
      <CardContent className="px-0">
        <div className="flex flex-col gap-1 text-muted-foreground font-thin">
          {loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <SecuritySkeleton key={index} />
            ))
          ) : stockHoldings.length > 0 ? (
            stockHoldings.map((stock) => (
              <SecurityItem
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
                type="stock"
              />
            ))
          ) : (
            <div className="text-center font-thin py-4">
              No stock holdings found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
      <Dialog open={showAuthAlert} onOpenChange={setShowAuthAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{"You're not logged in"}</DialogTitle>
            <DialogDescription>
              As an anonymous user, you are not permitted to refresh stock prices. Please sign up for an account to use this feature.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowAuthAlert(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}