import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'
import {
  ReceiptText,
  ChartCandlestick,
  TrendingUp,
  TrendingDown
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface StockCardProps {
  ticker: string;
  name: string;
  logoUrl: string;
  totalAmount: string;
  quantity: string;
  pnl: string;
  price: string;
  priceStatus?: 'loading' | 'error' | 'success';
}

function StockCard({ ticker, name, logoUrl, totalAmount, quantity, pnl, price, priceStatus }: StockCardProps) {
  const pnlValue = pnl !== "..." ? parseFloat(pnl) : NaN;

  return (
    <Card className="shadow-none border-t-0 rounded-full py-3 bg-muted/50 text-card-foreground">
      <CardContent className="flex items-center gap-3 px-3">
        <Image
          src={logoUrl}
          alt={name}
          width={56}
          height={56}
          className="rounded-full object-contain border"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 max-w-[150px]">
              <CardTitle>{ticker}</CardTitle>
              <CardDescription className="text-xs truncate">
                {name}
              </CardDescription>
            </div>
            <CardDescription className="flex items-center gap-1 truncate">
              <Badge
                variant="outline"
                className="rounded-full bg-secondary/50 text-muted-foreground"
              >
                <ReceiptText />{quantity}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full flex items-center gap-1.5 bg-secondary/50 text-muted-foreground"
              >
                <ChartCandlestick />
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
          </div>
          <div className="flex flex-col justify-end gap-1 px-1  ">
            <CardTitle className="text-right text-sm">
              {totalAmount}
            </CardTitle>
            <CardDescription className="flex items-center justify-end">
              <Badge variant="outline" className="bg-secondary/50 text-muted-foreground">
                {pnlValue !== null && pnlValue < 0 ? (
                  <TrendingDown className="size-4 text-red-700 dark:text-red-400" />
                ) : (
                  <TrendingUp className="size-4 text-green-700 dark:text-green-400" />
                )}
                {pnl === "..." ? pnl : <>{pnl}%</>}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StockSkeleton() {
  return (
    <Card className="rounded-full py-2 bg-background border-none shadow-none">
      <CardContent className="flex items-center gap-3 px-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-[70px]" />
              <Skeleton className="h-3 w-[120px]" />
            </div>
            <div className="flex items-center gap-1">
                <Skeleton className="h-8 w-[80px] rounded-full" />
                <Skeleton className="h-8 w-[100px] rounded-full" />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-1 px-4">
            <Skeleton className="h-6 w-[80px] self-end" />
            <Skeleton className="h-8 w-[70px] rounded-full self-end" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StockCardLite({ ticker, name, logoUrl, totalAmount, pnl, price }: StockCardProps) {
  const pnlValue = pnl !== "..." ? parseFloat(pnl) : NaN;

  return (
    <Card className="shadow-none border-none rounded-full py-2 bg-muted/50 text-card-foreground">
      <CardContent className="flex items-center gap-3 px-4">
        <Image
          src={logoUrl}
          alt={name}
          width={48}
          height={48}
          className="rounded-full object-contain border h-12"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 max-w-[150px]">
              <CardTitle>{ticker}</CardTitle>
              <CardDescription className="text-xs truncate">
                {name}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col justify-end px-1">
            <CardTitle className="text-right text-sm">
              {totalAmount}
            </CardTitle>
            <CardDescription className="flex text-xs gap-1 items-center justify-end">

                {pnlValue !== null && pnlValue < 0 ? (
                  <TrendingDown className="size-4 text-red-700 dark:text-red-400" />
                ) : (
                  <TrendingUp className="size-4 text-green-700 dark:text-green-400" />
                )}
                {pnl === "..." ? pnl : <>{pnl}%</>}
            </CardDescription>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export {
  StockCard,
  StockSkeleton,
  StockCardLite
}