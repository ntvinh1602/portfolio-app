"use client"

import { Asset, AssetSkeleton } from "@/app/reports/components/stock-item"
import * as Card from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { useReportsData } from "@/hooks/useReportsData"
import { Tables } from "@/types/database.types"

// Original nullable Supabase type
type RawStockPnLItem = Tables<"stock_annual_pnl">

// Local normalized type (nulls handled)
interface StockPnLItem {
  logo_url: string
  name: string
  ticker: string
  total_pnl: number
  year: number
}

export function StockLeaderboard({ year }: { year?: string | number }) {
  const { stockPnLData, isLoading, error } = useReportsData()
  const yearKey = year?.toString()

  // --- Normalize nullables ---
  const cleanedData: StockPnLItem[] = (stockPnLData || [])
    .filter((item): item is RawStockPnLItem => !!item) // defensive
    .map((item) => ({
      logo_url: item.logo_url ?? "",
      name: item.name ?? "Unknown",
      ticker: item.ticker ?? "N/A",
      total_pnl: item.total_pnl ?? 0,
      year: item.year ?? 0,
    }))

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

  if (cleanedData.length === 0) {
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
  const groupedByYear = cleanedData.reduce(
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
    cleanedData.forEach((item) => {
      const key = item.ticker
      if (!merged[key]) {
        merged[key] = { ...item }
      } else {
        merged[key].total_pnl += item.total_pnl
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
