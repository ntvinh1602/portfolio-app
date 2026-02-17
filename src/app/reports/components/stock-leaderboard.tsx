"use client"

import { Asset, AssetSkeleton } from "@/app/reports/components/stock-item"
import { Card, CardDescription, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
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
    <CardHeader>
      <CardTitle className="text-xl">Best Performers</CardTitle>
      <CardDescription>Based on total realized P/L</CardDescription>
      <CardAction>
        <Trophy className="stroke-1 size-5" />
      </CardAction>
    </CardHeader>
  )

  // --- Loading state ---
  if (isLoading) {
    return (
      <Card variant="glow" className="h-full">
        {renderHeader()}
        <CardContent>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <AssetSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <Card variant="glow" className="h-full">
        {renderHeader()}
        <CardContent>
          <div className="p-4 text-center text-destructive">
            Failed to load stock data.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (cleanedData.length === 0) {
    return (
      <Card variant="glow" className="h-full">
        {renderHeader()}
        <CardContent>
          <div className="p-4 text-center text-muted-foreground">
            No realized profit/loss data available.
          </div>
        </CardContent>
      </Card>
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
      <Card variant="glow" className="h-full">
        {renderHeader()}
        <CardContent>
          <div className="p-4 text-center text-muted-foreground">
            No realized profit/loss data for {yearKey || "selected year"}.
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- Sort and select top performers ---
  const topPerformers = [...pnlList]
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 10)

  return (
    <Card variant="glow" className="h-full">
      {renderHeader()}
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
