import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { compactNum } from "@/lib/utils"
import { useDelayedData } from "@/hooks/useDelayedData"
import { useReportsData } from "@/hooks/useReportsData"
import { TrendingUp, TrendingDown, ArrowDownCircle, ArrowLeftRight, ArrowUpCircle } from "lucide-react"

export function Cashflow({
  year,
  className,
}: {
  year: string
  className?: string
}) {
  const { isLoading: isDelayedLoading } = useDelayedData()
  const { yearlyData, isLoading: isReportsLoading } = useReportsData()

  const isLoading = isDelayedLoading || isReportsLoading || !yearlyData

  if (isLoading)
    return (
      <Card.Root className="gap-0 h-fit">
        <Card.Header>
          <Card.Title>Cashflow</Card.Title>
          <Card.Action>
            <ArrowLeftRight className="size-5 stroke-1"/>
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

  // Determine which year's data to display
  const yearNum = year === "All Time" ? "All-Time" : year
  const yearData = yearlyData.find((item) => item.year === yearNum)
  const inflow = yearData?.deposits ?? 0
  const outflow = Math.abs(yearData?.withdrawals ?? 0)
  const net = inflow - outflow

  return (
    <Card.Root variant="glow" className={`gap-6 h-fit ${className}`}>
      <Card.Header>
        <Card.Title className="text-xl">Cashflow</Card.Title>
        <Card.Action>
          <ArrowLeftRight className="size-5 stroke-1"/>
        </Card.Action>
      </Card.Header>
      <Card.Content className="px-6 pb-6 flex flex-col gap-4">
        <div className="flex font-light items-center justify-between group">
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="size-5 stroke-1" />
            <p className="text-muted-foreground">Deposits</p>
          </div>
          <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
            <TrendingUp className="text-green-500" />
            {compactNum(inflow)}
          </div>
        </div>

        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="size-5 stroke-1" />
            <p className="text-muted-foreground">Withdrawals</p>
          </div>
          <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
            <TrendingDown className="text-red-700" />
            {compactNum(outflow)}
          </div>
        </div>

        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Net Cashflow</p>
            <div className="flex items-center gap-1 font-thin [&_svg]:size-5">
              {net !== null && net < 0
                ? <TrendingDown className="text-red-700" />
                : <TrendingUp className="text-green-500" />
              }
              {net !== null && `${compactNum(Math.abs(net))}`}
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}
