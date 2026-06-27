"use client"

import type { StockPnLItem } from "@fund/fund.types"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Trophy } from "lucide-react"
import AssetItem from "@fund/components/asset-item"

interface TopStocksProps {
  year: number
  stockData: StockPnLItem[]
}

export function TopStocks({ year, stockData }: TopStocksProps) {
  if (!stockData || stockData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl font-normal">Best Performers</CardTitle>
          <CardDescription>Based on total realized P/L</CardDescription>
        </CardHeader>
        <CardContent className="p-4 text-center text-muted-foreground">
          No realized profit/loss data for {year}.
        </CardContent>
      </Card>
    )
  }

  const topPerformers = [...stockData]
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Performers</CardTitle>
        <CardDescription>Based on total realized P/L</CardDescription>
        <CardAction>
          <Trophy className="stroke-1" />
        </CardAction>
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
  )
}
