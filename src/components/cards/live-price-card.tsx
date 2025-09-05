"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { formatNum } from "@/lib/utils"

interface PriceData {
  symbol: string
  price: number
  quantity: number
  side: string
  time: string
}

interface LivePriceCardProps {
  data: Record<string, PriceData>
}

export function LivePriceCard({ data }: LivePriceCardProps) {
  const tcbData = data["TCB"]
  const hpgData = data["HPG"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Live Market Data</CardTitle>
          <TrendingUp className="stroke-1 text-muted-foreground" />
        </div>
        <CardDescription>Real-time prices from DNSE</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">TCB</p>
            <p className={`text-lg font-semibold ${tcbData?.side === "B" ? "text-green-500" : "text-red-500"}`}>
              {tcbData ? formatNum(tcbData.price, 2) : "Loading..."}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Quantity</p>
            <p>{tcbData ? tcbData.quantity : "-"}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">HPG</p>
            <p className={`text-lg font-semibold ${hpgData?.side === "B" ? "text-green-500" : "text-red-500"}`}>
              {hpgData ? formatNum(hpgData.price, 2) : "Loading..."}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Quantity</p>
            <p>{hpgData ? hpgData.quantity : "-"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}