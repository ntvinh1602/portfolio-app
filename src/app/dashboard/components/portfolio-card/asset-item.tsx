import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Root,
  Content,
  Subtitle,
  Title
} from "@/components/ui/card"
import Image from 'next/image'
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Coins,
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
    <Root className="border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl py-3">
      <Content className="flex items-center gap-3 px-3">
        <Image
          src={logoUrl}
          alt={name}
          width={56}
          height={56}
          className="rounded-full bg-background"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[180px]">
            <Title>{ticker}</Title>
            <Subtitle className="text-xs truncate">
              {name}
            </Subtitle>
            {<Subtitle className="flex items-center gap-1 truncate pt-1">
                <Badge variant="outline" className="font-thin text-foreground">
                  <Leaf />
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
                  <Coins />
                  {price
                    ? type === 'stock'
                      ? formatNum(price, 2)
                      : formatNum(price)
                    : 0
                  }
                </Badge>
              </Subtitle>}
          </div>
          <div className="flex flex-col justify-end pr-2">
            <Title className="text-right text-sm">
              {formatNum(totalAmount)}
            </Title>
            <Subtitle className="flex items-center justify-end text-xs gap-1">
              <div className="[&_svg]:size-4 [&_svg]:stroke-2 flex gap-1">
                {pnlNet !== null && pnlNet < 0
                  ? <TrendingDown className="text-red-700" />
                  : <TrendingUp className="text-green-500" />
                }
                {compactNum(Math.abs(pnlNet))}
                {` (${formatNum(Math.abs(pnlPct), 1)}%)`}
              </div>
            </Subtitle>
          </div>
        </div>
      </Content>
    </Root>
  )
}