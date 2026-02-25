"use client"

import { Asset } from "./stock-item"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card"
import { Trophy } from "lucide-react"

export interface StockPnLItem {
  logo_url: string
  name: string
  ticker: string
  total_pnl: number
}

interface TopStocksProps {
  year: number
  stockData: StockPnLItem[]
}

export function TopStocks({ year, stockData }: TopStocksProps) {
  if (!stockData || stockData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-xl font-normal">
            Best Performers
          </CardTitle>
          <CardDescription>
            Based on total realized P/L
          </CardDescription>
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
    <Card className="relative h-full rounded-xl backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent">
      <CardHeader>
        <CardTitle className="text-xl font-normal">
          Best Performers
        </CardTitle>
        <CardDescription>
          Based on total realized P/L
        </CardDescription>
        <CardAction>
          <Trophy className="stroke-1 size-5" />
        </CardAction>
      </CardHeader>

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