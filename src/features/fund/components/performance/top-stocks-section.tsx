"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { TopStocks } from "../ui/top-stocks"
import { useStockPnl } from "@fund/hooks/use-performance-data"
import AssetItem from "@/features/fund/components/ui/asset-item"
import StatusLabel from "@/components/status-label"
import type { StockPnl } from "@fund/fund.types"
import { ItemGroup } from "@/components/ui/item"

function useTopPerformers(data: StockPnl[] | undefined) {
  return useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.total_pnl - a.total_pnl).slice(0, 10)
  }, [data])
}

export function TopStocksSection() {
  const { year } = usePerformanceYear()
  const { data, error, isLoading } = useStockPnl(year)
  const topPerformers = useTopPerformers(data)

  if (isLoading)
    return (
      <TopStocks>
        <StatusLabel
          type="loading"
          title="Counting pennies..."
          description={`Looking for your best performed stocks in ${year != 9999 ? year : "all time"}`}
        />
      </TopStocks>
    )
  if (error)
    return (
      <TopStocks>
        <StatusLabel type="error" description={error.message} />
      </TopStocks>
    )
  if (!data)
    return (
      <TopStocks>
        <StatusLabel
          type="empty"
          title="No stocks available"
          description="No realized loss or profit recorded in the period"
        />
      </TopStocks>
    )

  return (
    <TopStocks>
      <ItemGroup className="gap-2">
        {topPerformers.map((stock) => (
          <AssetItem
            key={stock.ticker}
            variant="performance"
            ticker={stock.ticker}
            name={stock.name}
            logo_url={stock.logo_url}
            total_value={stock.total_pnl}
          />
        ))}
      </ItemGroup>
    </TopStocks>
  )
}
