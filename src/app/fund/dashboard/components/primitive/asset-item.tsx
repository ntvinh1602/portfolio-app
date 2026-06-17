"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from 'next/image'
import {
  TrendingUp,
  TrendingDown,
  Coins,
  ShoppingBag,
} from "lucide-react"
import { formatNum, compactNum, cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

export function Asset({
  name,
  logoUrl,
  quantity,
  price,
  costBasis,
}: {
  name: string
  logoUrl: string
  quantity: number
  price: number
  costBasis: number
}) {
  const isMobile = useIsMobile()
  const totalAmount = quantity * price
  const pnlNet = totalAmount - costBasis
  const pnlPct = ((totalAmount / costBasis) - 1) * 100
  const isPositive = pnlNet >= 0

  return (
    <Card className="py-3 hover:bg-accent/50 transition-colors ring-0 shadow-none">
      <CardContent className="flex items-center gap-4 px-0 md:px-2">
        <Image
          src={logoUrl}
          alt={name}
          width={44}
          height={44}
          className="rounded-full bg-background shrink-0"
        />
        <div className="flex justify-between w-full items-center min-w-0">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">
              {name}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline">
                <Coins className="size-3" />
                {!isMobile ? formatNum(quantity) : compactNum(quantity)}
              </Badge>
              <Badge variant="outline">
                <ShoppingBag className="size-3" />
                {formatNum(price / 1000, 2)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-4">
            <span className="text-sm font-medium tabular-nums">
              {formatNum(totalAmount)}
            </span>
            <div className={cn(
              "flex items-center gap-1 text-xs mt-1 tabular-nums",
              isPositive ? "text-green-600" : "text-red-600"
            )}>
              {isPositive
                ? <TrendingUp className="size-3.5" />
                : <TrendingDown className="size-3.5" />
              }
              <span>{compactNum(Math.abs(pnlNet))}</span>
              <span>({formatNum(pnlPct, 1)}%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}