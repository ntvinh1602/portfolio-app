"use client"

import { Asset, AssetSkeleton } from "@/app/reports/components/stock-item"
import { useReportsData } from "@/hooks/useReportsData"
import * as Card from "@/components/ui/card"
import { StockPnLItem } from "@/hooks/useReportsData"
import { Trophy } from "lucide-react"

export function StockLeaderboard({ year }: { year?: string | number }) {
  const { stockPnL, assets, isLoading, error } = useReportsData()

  const yearKey = year?.toString()

  const renderHeader = () => (
    <Card.Header>
      <Card.Title className="text-xl">Best Performers</Card.Title>
      <Card.Subtitle>Based on total realized P/L</Card.Subtitle>
      <Card.Action>
        <Trophy className="stroke-1 size-5" />
      </Card.Action>
    </Card.Header>
  )

  // Loading state
  if (isLoading) {
    return (
      <Card.Root variant="glow" className="h-full">
        {renderHeader()}
        <Card.Content>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <AssetSkeleton key={i} />
            ))}
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  // Error state
  if (error) {
    return (
      <Card.Root variant="glow" className="h-full">
        {renderHeader()}
        <Card.Content>
          <div className="p-4 text-center text-destructive">
            Failed to load stock data.
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  let pnlList: StockPnLItem[] = []

  if (yearKey === "All Time") {
    const mergedPnL: Record<string, StockPnLItem> = {}
    Object.values(stockPnL).forEach((yearData) => {
      yearData.forEach((item) => {
        if (!mergedPnL[item.ticker]) {
          mergedPnL[item.ticker] = { ...item }
        } else {
          mergedPnL[item.ticker].total_pnl += item.total_pnl
        }
      })
    })
    pnlList = Object.values(mergedPnL)
  } else {
    const activeYearKey = yearKey || Object.keys(stockPnL)[0]
    pnlList = stockPnL[activeYearKey] || []
  }

  if (pnlList.length === 0) {
    return (
      <Card.Root variant="glow" className="h-full">
        {renderHeader()}
        <Card.Content>
          <div className="p-4 text-center text-muted-foreground">
            No realized profit/loss data for {yearKey || "selected year"}.
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  const stockAssets = assets.filter((a) => a.asset_class === "stock")
  const combined = pnlList.map((pnl) => {
    const asset = stockAssets.find((a) => a.ticker === pnl.ticker)
    return {
      ...pnl,
      name: asset?.name ?? pnl.ticker,
      logoUrl: asset?.logo_url ?? "",
    }
  })

  const topPerformers = combined
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 10)

  if (topPerformers.length === 0) {
    return (
      <Card.Root variant="glow" className="h-full">
        {renderHeader()}
        <Card.Content>
          <div className="p-4 text-center text-muted-foreground">
            No stock found for {yearKey || "selected year"}.
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  return (
    <Card.Root variant="glow" className="h-full">
      {renderHeader()}
      <Card.Content>
        <div className="flex flex-col gap-2">
          {topPerformers.map((stock, index) => (
            <Asset
              key={stock.asset_id}
              rank={index + 1}
              ticker={stock.ticker}
              name={stock.name}
              logoUrl={stock.logoUrl}
              totalAmount={stock.total_pnl}
            />
          ))}
        </div>
      </Card.Content>
    </Card.Root>
  )
}
