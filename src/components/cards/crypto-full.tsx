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
import { useCryptoHoldings } from "@/hooks/useCryptoHoldings"
import {
  SecurityItem,
  SecuritySkeleton
} from "@/components/list-item/security"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState } from "react"
import { mutate } from "swr"
import { formatNum } from "@/lib/utils"

export function CryptoCardFull() {
  const { cryptoHoldings, loading } = useCryptoHoldings()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Note: This endpoint does not exist yet
    await fetch('/api/external/refresh-all-crypto-prices', { method: 'POST' });
    // Re-fetch the holdings data
    await mutate('/api/query/crypto-holdings');
    setIsRefreshing(false)
    setLastUpdated(new Date());
  };

  useEffect(() => {
    async function fetchLastUpdated() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_crypto_fetching')
          .eq('id', user.id)
          .single()
        if (profile?.last_crypto_fetching) {
          setLastUpdated(new Date(profile.last_crypto_fetching))
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
    const activeHoldings = cryptoHoldings.filter(item => item.total_amount > 0);
    activeHoldings.forEach((item, index) => {
      config[item.ticker] = {
        label: item.ticker,
        color: `var(--chart-${(index % 5) + 1})`,
      };
    });
    return config;
  }, [cryptoHoldings]);

  const chartData = React.useMemo(() => {
    return cryptoHoldings
      ?.filter(item => item.total_amount > 0)
      .map(item => ({
        asset: item.ticker,
        allocation: item.total_amount,
        fill: `var(--color-${item.ticker})`,
      }));
  }, [cryptoHoldings]);

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>Crypto</CardTitle>
        <CardDescription>Digital, decentralized, distributed</CardDescription>
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
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
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
                quantity={formatNum(crypto.quantity, 2)}
                totalAmount={formatNum(crypto.total_amount)}
                pnl={crypto.cost_basis > 0 ? formatNum(((crypto.total_amount / crypto.cost_basis) - 1) * 100, 1) : "0.0"}
                price={formatNum(crypto.latest_price, 2)}
                priceStatus="success"
                variant="full"
                type="crypto"
              />
            ))
          ) : (
            <div className="text-center font-thin py-4">
              No crypto holdings found.
            </div>
          )}
          {lastUpdated && !loading && cryptoHoldings.length > 0 && (
            <span className="text-right text-xs px-4">
              Last updated at {lastUpdated.toLocaleString(
                'en-SG',
                {
                  year: '2-digit',
                  month: '2-digit',
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