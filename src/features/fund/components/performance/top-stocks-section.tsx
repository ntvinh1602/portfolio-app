"use client"

import { useMemo } from "react"
import { usePerformanceYear } from "./context"
import { TopStocks } from "./top-stocks"
import { useStockPnl } from "@fund/hooks/use-performance-data"
import AssetItem from "@fund/components/asset-item"
import StatusLabel from "@/components/status-label"
import type { StockPnl } from "@fund/fund.types"

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

  if (isLoading) return <StatusLabel type="loading" />
  if (error)
    return (
      <StatusLabel
        type="error"
        title={error.name}
        description={error.message}
      />
    )
  if (!data) return null

  return (
    <TopStocks>
      {topPerformers.length > 0 ? (
        <div className="flex flex-col gap-2">
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
        </div>
      ) : (
        <StatusLabel
          type="empty"
          title="No stocks found"
          description="Top performers will show here once realized P/L is made"
        />
      )}
    </TopStocks>
  )
}
