import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelayedData } from "@/hooks/useDelayedData"
import { useReportsData } from "@/hooks/useReportsData"
import { formatNum } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Landmark, PiggyBank } from "lucide-react"

export function Return({
  year,
  className,
}: {
  year: string
  className?: string
}) {
  const { isLoading: isDelayedLoading } = useDelayedData()
  const { annualReturn, isLoading: isReportsLoading } = useReportsData()

  const isLoading = isDelayedLoading || isReportsLoading

  if (isLoading)
    return (
      <Card.Root className="gap-0 h-full">
        <Card.Header>
          <Card.Title>Return</Card.Title>
          <Card.Action>
            <DollarSign className="size-5 stroke-1"/>
          </Card.Action>
        </Card.Header>
        <Card.Content className="px-6 pb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </Card.Content>
      </Card.Root>
    )

  // Use key as-is, fallback to most recent year if not found
  const key = year === "All Time" ? "All-Time" : String(year)
  const currentData =
    annualReturn[key] ??
    Object.entries(annualReturn)
      .sort((a, b) => {
        const aNum = a[0] === "All-Time" ? Infinity : Number(a[0])
        const bNum = b[0] === "All-Time" ? Infinity : Number(b[0])
        return bNum - aNum
      })[0]?.[1] ??
    null

  const equityReturn = currentData?.equity_return ?? null
  const vnIndexReturn = currentData?.vnindex_return ?? null
  const alpha =
    equityReturn !== null && vnIndexReturn !== null
      ? equityReturn - vnIndexReturn
      : null

  return (
    <Card.Root variant="glow" className={`gap-6 h-full ${className}`}>
      <Card.Header>
        <Card.Title className="text-xl">Return</Card.Title>
        <Card.Action>
          <DollarSign className="size-5 stroke-1"/>
        </Card.Action>
      </Card.Header>
      <Card.Content className="px-6 pb-6 flex flex-col gap-4">
        <div className="flex font-light items-center justify-between group">
          <div className="flex items-center gap-3">
            <PiggyBank className="size-5 stroke-1" />
            <p className="text-muted-foreground">Equity</p>
          </div>
          <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
            {equityReturn !== null && equityReturn < 0
              ? <TrendingDown className="text-red-700" />
              : <TrendingUp className="text-green-500" />
            }
            {equityReturn !== null && `${formatNum(Math.abs(equityReturn),1)}%`}
          </div>
        </div>
        
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <Landmark className="size-5 stroke-1" />
            <p className="text-muted-foreground">VN-Index</p>
          </div>
          <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
            {vnIndexReturn !== null && vnIndexReturn < 0
              ? <TrendingDown className="text-red-700" />
              : <TrendingUp className="text-green-500" />
            }
            {vnIndexReturn !== null && `${formatNum(Math.abs(vnIndexReturn),1)}%`}
          </div>
        </div>
        
        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Alpha</p>
            <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
              {alpha !== null && alpha < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {alpha !== null && `${formatNum(Math.abs(alpha),1)}%`}
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}
