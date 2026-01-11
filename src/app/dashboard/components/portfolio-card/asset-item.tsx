import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'
import {
  TrendingUp,
  TrendingDown,
  Coins,
  ShoppingBag,
} from "lucide-react"
import { formatNum, compactNum } from "@/lib/utils"

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
    <Card.Root variant="highlight" className="rounded-full py-3">
      <Card.Content className="flex items-center gap-3 px-4">
        <Image
          src={logoUrl}
          alt={name}
          width={48}
          height={48}
          className="rounded-full bg-background"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col max-w-[250px]">
            <Card.Title className="text-sm truncate">{name}</Card.Title>
            <Card.Subtitle className="flex items-center gap-1 truncate pt-1">
              <Badge variant="outline" className="font-thin text-foreground">
                <Coins className="stroke-1"  />
                {quantity
                  ? type === 'stock'
                    ? <>{formatNum(quantity)}</>
                    : <>{formatNum(
                        quantity,
                        ticker === "BTC" ? 8 : 2
                      )}</>
                  : 0
                }
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
                {price
                  ? type === 'stock'
                    ? formatNum(price, 2)
                    : formatNum(price, ticker === 'BTC' ? 2 : 4)
                  : 0
                }
              </Badge>
            </Card.Subtitle>
          </div>
          <div className="flex flex-col justify-end pr-2">
            <Card.Title className="text-right text-sm">
              {formatNum(totalAmount)}
            </Card.Title>
            <Card.Subtitle className="flex items-center justify-end text-xs gap-1">
              <div className="[&_svg]:size-4 [&_svg]:stroke-2 flex gap-1">
                {pnlNet !== null && pnlNet < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                <span>{compactNum(Math.abs(pnlNet))}</span>
                <span>{`${formatNum((pnlPct), 1)}%`}</span>
              </div>
            </Card.Subtitle>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}

export function AssetSkeleton() {
  return (
    <Card.Root className="border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl py-3">
      <Card.Content className="flex items-center gap-3 px-3">
        
        {/* Logo */}
        <Skeleton className="size-14 aspect-square rounded-full" />

        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[180px]">
            
            {/* Ticker */}
            <Skeleton className="h-4 w-16" />
            
            {/* Name */}
            <Skeleton className="h-3 w-28" />

            {/* Quantity + Price badges */}
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>

          <div className="flex flex-col justify-end pr-2">
            {/* Total Amount */}
            <Skeleton className="h-4 w-20 self-end" />

            {/* PnL */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}