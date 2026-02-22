import { Card, CardDescription, CardContent, CardTitle } from "@/components/ui/card"
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
    <Card className="relative text-card-foreground rounded-full py-3
      border-0 bg-gradient-to-r from-ring/10 to-transparent backdrop-blur-sm before:content-[''] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-full before:h-px before:bg-gradient-to-r before:from-transparent before:via-ring/50 before:to-transparent"
    >
      <CardContent className="flex items-center gap-3 px-3">
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
            <CardTitle className="text-sm truncate">{ticker}</CardTitle>
            <CardDescription className="flex items-center gap-1 truncate pt-1">
              {name}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 font-thin text-sm justify-end px-2 [&_svg]:stroke-1">
            {totalAmount !== null && totalAmount < 0
              ? <TrendingDown className="text-red-700" />
              : <TrendingUp className="text-green-500" />
            }
            {compactNum(totalAmount)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AssetSkeleton() {
  return (
    <Card className="border-0 text-card-foreground bg-muted dark:bg-muted/50 backdrop-blur-sm rounded-xl py-3">
      <CardContent className="flex items-center gap-3 px-3">
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
      </CardContent>
    </Card>
  )
}