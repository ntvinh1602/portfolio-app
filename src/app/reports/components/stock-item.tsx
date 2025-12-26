import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from 'next/image'
import { TrendingUp, TrendingDown, Award } from "lucide-react"
import { compactNum } from "@/lib/utils"

export function Asset({
  rank,
  ticker,
  name,
  logoUrl,
  totalAmount,
}: {
  rank: number
  ticker: string
  name: string
  logoUrl: string
  totalAmount: number
}) {

  // Determine rank color
  const AwardColor = rank === 1
    ? "text-yellow-400"
    : rank === 2
      ? "text-gray-400"
      : rank === 3
        ? "text-amber-700"
        : "text-foreground"

  return (
    <Card.Root className="border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl py-3">
      <Card.Content className="flex items-center gap-3 px-3">
        <div className="w-6 flex justify-center">
          {rank <= 3 ? (
            <Award className={`stroke-1 ${AwardColor}`} />
          ) : (
            <span className="text-xs text-muted-foreground font-semibold">
              {rank}
            </span>
          )}
        </div>
        
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
            {compactNum(totalAmount)}
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
        <div className="w-6 flex justify-center">
          <Skeleton className="w-4 h-4 rounded-full" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full bg-background" />
        <div className="flex justify-between w-full items-center">
          <div className="flex flex-col max-w-[250px] space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-1 font-thin text-sm justify-end px-2">
            <Skeleton className="w-14 h-4" />
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}