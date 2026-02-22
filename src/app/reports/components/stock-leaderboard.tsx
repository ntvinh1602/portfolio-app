"use client"

import { Asset } from "@/app/reports/components/stock-item"
import { Card, CardDescription, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import { Trophy } from "lucide-react"
import { useReportsData } from "@/hooks/useReportsData"

// Local normalized type (nulls handled)
interface StockPnLItem {
  logo_url: string
  name: string
  ticker: string
  total_pnl: number
  year: number
}

export function StockLeaderboard({ year }: { year?: string | number }) {
  const { stockPnLData, error } = useReportsData()
  const yearKey = year?.toString()

  const cleanedData: StockPnLItem[] = (stockPnLData || []).map((item) => ({
    logo_url: item.logo_url ?? "",
    name: item.name ?? "Unknown",
    ticker: item.ticker ?? "N/A",
    total_pnl: item.total_pnl ?? 0,
    year: item.year ?? 0,
  }))

  const groupedByYear = cleanedData.reduce(
    (acc: Record<string, StockPnLItem[]>, item) => {
      const key = item.year.toString()
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {}
  )

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

  const topPerformers = [...pnlList]
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 10)

  return (
    <Card className="h-full rounded-xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent">
      <CardHeader>
        <CardTitle className="text-xl">Best Performers</CardTitle>
        <CardDescription>Based on total realized P/L</CardDescription>
        <CardAction>
          <Trophy className="stroke-1 size-5" />
        </CardAction>
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="p-4 text-center text-destructive">
            Failed to load stock data.
          </div>
        ) : cleanedData.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No realized profit/loss data available.
          </div>
        ) : pnlList.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No realized profit/loss data for {yearKey || "selected year"}.
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  )
}
