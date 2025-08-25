import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Bitcoin,
  Coins,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNum, compactNum } from "@/lib/utils"

interface SecurityItemProps {
  ticker: string
  name: string
  logoUrl: string
  totalAmount: number
  pnlPct: number
  pnlNet: number
  quantity?: number
  price?: number
  variant?: 'full' | 'compact'
  type: 'stock' | 'crypto'
}

function SecurityItem({
  ticker,
  name,
  logoUrl,
  totalAmount,
  quantity,
  pnlPct,
  pnlNet,
  price,
  variant = 'full',
  type
}: SecurityItemProps) {
  const isCompact = variant === 'compact'

  return (
    <Card className={`border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl ${isCompact ? 'py-2' : 'py-3'}`}>
      <CardContent className="flex items-center gap-3 px-3">
        <Image
          src={logoUrl}
          alt={name}
          width={isCompact ? 48 : 56}
          height={isCompact ? 48 : 56}
          className="rounded-full bg-background"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[160px]">
            <CardTitle>{ticker}</CardTitle>
            <CardDescription className="text-xs truncate">
              {name}
            </CardDescription>
            {!isCompact && (
              <CardDescription className="flex items-center gap-1 truncate pt-1">
                <Badge variant="outline" className="font-thin">
                  {quantity 
                    ? type === 'stock'
                      ? <><Leaf />{formatNum(quantity)}</>
                      : <><Bitcoin />{formatNum(quantity, 5)}</>
                    : 0
                  }
                </Badge>
                <Badge variant="outline" className="font-thin">
                  <Coins />
                  {price
                    ? type === 'stock'
                      ? formatNum(price, 2)
                      : compactNum(price)
                    : 0
                  }
                </Badge>
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col justify-end pr-2">
            <CardTitle className="text-right text-sm">
              {formatNum(totalAmount)}
            </CardTitle>
            <CardDescription className="flex items-center justify-end text-xs gap-1">
              <div className="[&_svg]:size-4 [&_svg]:stroke-2 flex gap-1">
                {pnlNet !== null && pnlNet < 0
                  ? <TrendingDown className="text-red-700 dark:text-red-400" />
                  : <TrendingUp className="text-green-700 dark:text-green-400" />
                }
                {compactNum(Math.abs(pnlNet))}
                {` (${formatNum(Math.abs(pnlPct), 1)}%)`}
              </div>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SecuritySkeletonProps {
  variant?: 'full' | 'compact'
}

function SecuritySkeleton({ variant = 'full' }: SecuritySkeletonProps) {
  const isCompact = variant === 'compact'

  return (
    <Card className={`rounded-full border-0 text-card-foreground ${isCompact ? 'py-2' : 'py-3'}`}>
      <CardContent className={`flex items-center gap-3 ${isCompact ? 'px-4' : 'px-3'}`}>
        <Skeleton className={`rounded-full ${isCompact ? 'h-12 w-12' : 'h-14 w-14'}`} />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[150px]">
            <Skeleton className="h-6 w-[70px]" />
            <Skeleton className="h-3 w-[120px]" />
            {!isCompact && (
              <div className="flex items-center gap-1 pt-1">
                <Skeleton className="h-4 w-[80px] rounded-full" />
                <Skeleton className="h-4 w-[100px] rounded-full" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-end items-end gap-1 px-1">
            <Skeleton className="h-5 w-[80px]" />
            {isCompact ? (
              <Skeleton className="h-4 w-[50px]" />
            ) : (
              <Skeleton className="h-4 w-[40px] rounded-full" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export {
  SecurityItem,
  SecuritySkeleton,
}