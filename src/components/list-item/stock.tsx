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
  TrendingDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNum } from "@/lib/utils"
import { useStockPrice } from "@/hooks/useStockPrice"

interface StockItemWrapperProps {
  ticker: string;
  name: string;
  logoUrl: string;
  quantity: number;
  costBasis: number;
  refreshKey: number;
  lastUpdatedPrice: number;
  onRefreshComplete: () => void;
}

function StockItemWrapper({ ticker, name, logoUrl, quantity, costBasis, refreshKey, lastUpdatedPrice, onRefreshComplete }: StockItemWrapperProps) {
  const { price, priceStatus } = useStockPrice({ ticker, refreshKey, lastUpdatedPrice, onRefreshComplete });

  return (
    <StockItem
      ticker={ticker}
      name={name}
      logoUrl={logoUrl}
      quantity={formatNum(quantity)}
      totalAmount={priceStatus === 'success' ? formatNum(quantity * price) : "..."}
      pnl={priceStatus === 'success' ? formatNum((quantity * price / costBasis - 1) * 100, 1) : "..."}
      price={formatNum(price / 1000, 2)}
      priceStatus={priceStatus}
      variant="full"
    />
  )
}

interface StockItemProps {
  ticker: string;
  name: string;
  logoUrl: string;
  totalAmount: string;
  pnl: string;
  quantity?: string;
  price?: string;
  priceStatus?: 'loading' | 'error' | 'success';
  variant?: 'full' | 'compact';
}

function StockItem({
  ticker,
  name,
  logoUrl,
  totalAmount,
  quantity,
  pnl,
  price,
  priceStatus,
  variant = 'full'
}: StockItemProps) {
  const pnlValue = pnl !== "..." ? parseFloat(pnl) : NaN;
  const isCompact = variant === 'compact';

  return (
    <Card className={`rounded-full text-card-foreground ${isCompact ? 'border-none py-2' : 'border-t-0 py-3'}`}>
      <CardContent className={`flex items-center gap-3 ${isCompact ? 'px-4' : 'px-3'}`}>
        <Image
          src={logoUrl}
          alt={name}
          width={isCompact ? 48 : 56}
          height={isCompact ? 48 : 56}
          className="rounded-full object-contain border"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[160px]">
            <CardTitle>{ticker}</CardTitle>
            <CardDescription className="text-xs truncate">
              {name}
            </CardDescription>
            {!isCompact && (
              <CardDescription className="flex items-center gap-1 truncate pt-1">
                <Badge
                  variant="outline"
                  className="rounded-full bg-secondary/50 gap-0.5 text-muted-foreground"
                >
                  <Leaf />{quantity}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full bg-secondary/50 gap-1 text-muted-foreground"
                >
                  {priceStatus === 'loading' ? '...' : price}
                  {priceStatus && (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        priceStatus === 'loading' ? 'bg-yellow-400 animate-pulse' :
                        priceStatus === 'success' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}
                    />
                  )}
                </Badge>
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col justify-end px-1">
            <CardTitle className="text-right text-sm">
              {totalAmount}
            </CardTitle>
            <CardDescription className="flex items-center justify-end text-xs gap-1">
              <>
                {pnlValue !== null && pnlValue < 0 ? (
                  <TrendingDown className="size-4 text-red-700 dark:text-red-400" />
                ) : (
                  <TrendingUp className="size-4 text-green-700 dark:text-green-400" />
                )}
                {pnl === "..." ? pnl : <>{pnl}%</>}
              </>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface StockSkeletonProps {
  variant?: 'full' | 'compact';
}

function StockSkeleton({ variant = 'full' }: StockSkeletonProps) {
  const isCompact = variant === 'compact';

  return (
    <Card className={`rounded-full text-card-foreground ${isCompact ? 'border-none py-2' : 'border-t-0 py-3'}`}>
      <CardContent className={`flex items-center gap-3 ${isCompact ? 'px-4' : 'px-3'}`}>
        <Skeleton className={`rounded-full ${isCompact ? 'h-12 w-12' : 'h-14 w-14'}`} />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-1 max-w-[150px]">
            <Skeleton className="h-6 w-[70px]" />
            <Skeleton className="h-3 w-[120px]" />
            {!isCompact && (
              <div className="flex items-center gap-1 pt-1">
                <Skeleton className="h-8 w-[80px] rounded-full" />
                <Skeleton className="h-8 w-[100px] rounded-full" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-end items-end gap-1 px-1">
            <Skeleton className="h-5 w-[80px]" />
            {isCompact ? (
              <Skeleton className="h-4 w-[50px]" />
            ) : (
              <Skeleton className="h-8 w-[70px] rounded-full" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export {
  StockItem,
  StockSkeleton,
  StockItemWrapper,
}