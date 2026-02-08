"use client"

import { Asset, AssetSkeleton } from "@/app/reports/components/stock-item"
import { useReportsData } from "@/hooks/useReportsData"
import * as Card from "@/components/ui/card"
import { StockPnLItem } from "@/hooks/useReportsData"
import { Trophy } from "lucide-react"

export function StockLeaderboard({ year }: { year?: string | number }) {
  const { stockPnLData, isLoading, error } = useReportsData()
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

  // --- Loading state ---
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

  // --- Error state ---
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

  if (!stockPnLData || stockPnLData.length === 0) {
    return (
      <Card.Root variant="glow" className="h-full">
        {renderHeader()}
        <Card.Content>
          <div className="p-4 text-center text-muted-foreground">
            No realized profit/loss data available.
          </div>
        </Card.Content>
      </Card.Root>
    )
  }

  // --- Group by year ---
  const groupedByYear = stockPnLData.reduce(
    (acc: Record<string, StockPnLItem[]>, item) => {
      const key = item.year.toString()
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {}
  )

  // --- Filter or merge data ---
  let pnlList: StockPnLItem[] = []
  if (yearKey === "All Time") {
    const merged: Record<string, StockPnLItem> = {}
    stockPnLData.forEach((item) => {
      if (!merged[item.ticker]) {
        merged[item.ticker] = { ...item }
      } else {
        merged[item.ticker].total_pnl += item.total_pnl
      }
    })
    pnlList = Object.values(merged)
  } else {
    const activeYearKey = yearKey || Object.keys(groupedByYear)[0]
    pnlList = groupedByYear[activeYearKey] || []
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

  // --- Sort and select top performers ---
  const topPerformers = [...pnlList]
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 10)

  return (
    <Card.Root variant="glow" className="h-full">
      {renderHeader()}
      <Card.Content>
        <div className="flex flex-col gap-2">
          {topPerformers.map((stock, index) => (
            <Asset
              key={stock.ticker}
              rank={index + 1}
              ticker={stock.ticker}
              name={stock.name}
              logoUrl={stock.logo_url}
              totalAmount={stock.total_pnl}
            />
          ))}
        </div>
      </Card.Content>
    </Card.Root>
  )
}
