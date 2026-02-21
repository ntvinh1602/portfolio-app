"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardContent, CardTitle } from "@/components/ui/card"
import Image from 'next/image'
import {
  TrendingUp,
  TrendingDown,
  Coins,
  ShoppingBag,
} from "lucide-react"
import { formatNum, compactNum } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

export function Asset({
  ticker,
  name,
  logoUrl,
  totalAmount,
  quantity,
  pnlPct,
  pnlNet,
  price,
  prevPrice,
  type
}: {
  ticker: string
  name: string
  logoUrl: string
  totalAmount: number
  pnlPct: number
  pnlNet: number
  quantity: number
  price: number
  prevPrice?: number | null
  type: 'stock' | 'crypto'
}) {
  const isMobile = useIsMobile()
  const [priceChanged, setPriceChanged] = useState<"up" | "down" | null>(null)

  useEffect(() => {
    if (prevPrice) {
      if (price > prevPrice) {
        setPriceChanged("up")
      } else if (price < prevPrice) {
        setPriceChanged("down")
      }
      const timer = setTimeout(() => setPriceChanged(null), 1000)
      return () => clearTimeout(timer)
    }
  }, [price, prevPrice])

  return (
    <Card variant="highlight" className="rounded-full py-3">
      <CardContent className="flex items-center gap-3 px-4">
        <Image
          src={logoUrl}
          alt={name}
          width={48}
          height={48}
          className="rounded-full bg-background"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col max-w-[200px] w-full overflow-hidden">
            <CardTitle className="text-sm w-full truncate overflow-hidden whitespace-nowrap">
              {!isMobile ? name : ticker}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 truncate pt-1">
              <Badge variant="outline" className="font-thin text-foreground">
                <Coins className="stroke-1" />
                {!isMobile ? formatNum(quantity) : compactNum(quantity)}
              </Badge>
              <Badge
                variant="outline"
                className={`font-thin text-foreground ${
                  priceChanged === "up"
                    ? "animate-flash-green"
                    : priceChanged === "down"
                      ? "animate-flash-red"
                      : ""
                }`}
              >
                <ShoppingBag className="stroke-1" />
                {formatNum(price / 1000, 2)}
              </Badge>
            </CardDescription>
          </div>
          <div className="flex flex-col justify-end pr-2">
            <CardTitle className="text-right text-sm">
              {formatNum(totalAmount)}
            </CardTitle>
            <CardDescription className="flex items-center justify-end text-xs gap-1">
              <div className="[&_svg]:size-4 [&_svg]:stroke-2 flex gap-1">
                {pnlNet !== null && pnlNet < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                <span>{compactNum(Math.abs(pnlNet))}</span>
                <span>{`(${formatNum((pnlPct), 1)}%)`}</span>
              </div>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}