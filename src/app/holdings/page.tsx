"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw } from "lucide-react"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useState } from "react"
import { mutate } from "swr"
import { formatNum, compactNum } from "@/lib/utils"

export default function Page() {
  const { holdingsData, isLoading: loading } = useDashboardData()
  let { stockHoldings, cryptoHoldings } = holdingsData
  stockHoldings = stockHoldings.sort((a, b) => b.total_amount - a.total_amount);
  cryptoHoldings = cryptoHoldings.sort((a, b) => b.total_amount - a.total_amount);
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    setIsRefreshing(true)
    await fetch('/api/external/refresh-all-asset-prices', { method: 'POST' })

    // Re-fetch the holdings data
    if (user) {
      await mutate((key: string) => typeof key === 'string' && key.startsWith(`/api/gateway/${user.id}/dashboard`))
    }
    setIsRefreshing(false)
  }

  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      allocation: {
        label: "Allocation",
      },
    }
    const activeHoldings = stockHoldings.filter(item => item.total_amount > 0)
    activeHoldings.forEach((item, index) => {
      config[item.ticker] = {
        label: item.ticker,
        color: `var(--chart-${(index % 5) + 1})`,
      }
    })
    return config
  }, [stockHoldings])

  const chartData = React.useMemo(() => {
    return stockHoldings
      ?.filter(item => item.total_amount > 0)
      .map(item => ({
        asset: item.ticker,
        allocation: item.total_amount,
        fill: `var(--color-${item.ticker})`,
      }))
  }, [stockHoldings])

  return (
    <PageMain>
      <PageHeader title="Holdings" />
      <PageContent>
        <Tabs defaultValue="stocks">
          <div className="flex gap-6 items-center">
            <TabsList className="w-full">
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>
            <div className="[&_svg]:stroke-[1] text-muted-foreground">
              {
                isRefreshing
                  ? <RefreshCw className="animate-spin" />
                  : <RefreshCw onClick={handleRefresh} />
              }
            </div>
          </div>
          <TabsContent value="stocks" className="gap-4 flex flex-col">
            <Piechart 
              data={chartData}
              chartConfig={chartConfig}
              dataKey="allocation"
              nameKey="asset"
              legend="right"
              label_pos={1.8}
              className="h-[250px] w-full"
            />
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
                    pnlPct={stock.cost_basis > 0 ? formatNum(((stock.total_amount / stock.cost_basis) - 1) * 100, 1) : "0.0"}
                    pnlNet={compactNum(stock.total_amount - stock.cost_basis)}
                    price={formatNum(stock.latest_price / 1000, 2)}
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
          </TabsContent>
          <TabsContent value="crypto">
            <div className="flex flex-col gap-1 text-muted-foreground font-thin">
              {loading ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <SecuritySkeleton key={index} />
                ))
              ) : cryptoHoldings.length > 0 ? (
                cryptoHoldings.map((crypto) => (
                  <SecurityItem
                    key={crypto.ticker}
                    ticker={crypto.ticker}
                    name={crypto.name}
                    logoUrl={crypto.logo_url}
                    quantity={formatNum(crypto.quantity, 6)}
                    totalAmount={formatNum(crypto.total_amount)}
                    pnlPct={
                      crypto.cost_basis > 0
                        ? formatNum(((crypto.total_amount / crypto.cost_basis) - 1) * 100, 1)
                        : "0.0"
                    }
                    pnlNet={compactNum(crypto.total_amount - crypto.cost_basis)}
                    price={compactNum(crypto.latest_price)}
                    variant="full"
                    type="crypto"
                  />
                ))
              ) : (
                <div className="text-center font-thin py-4">
                  No crypto holdings found.
                </div>
              )}
            </div>          
          </TabsContent>
        </Tabs>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}