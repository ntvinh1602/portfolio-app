import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatNum } from "@/lib/utils"

export function Asset({
  ticker,
  name,
  logoUrl,
  totalAmount,
}: {
  ticker: string
  name: string
  logoUrl: string
  totalAmount: number
}) {

  return (
    <Card.Root className="border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl py-3">
      <Card.Content className="flex items-center gap-3 px-3">
        <Image
          src={logoUrl}
          alt={name}
          width={48}
          height={48}
          className="rounded-full bg-background"
        />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col max-w-[250px]">
            <Card.Title className="text-sm truncate">{ticker}</Card.Title>
            <Card.Subtitle className="flex items-center gap-1 truncate pt-1">
              {name}
            </Card.Subtitle>
          </div>
          <div className="flex items-center gap-1 font-thin text-sm justify-end px-2 [&_svg]:stroke-1">
            {totalAmount !== null && totalAmount < 0
              ? <TrendingDown className="text-red-700" />
              : <TrendingUp className="text-green-500" />
            }
            {formatNum(totalAmount)}
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