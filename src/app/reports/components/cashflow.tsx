import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { compactNum } from "@/lib/utils"
import { useDelayedData } from "@/hooks/useDelayedData"
import { useReportsData } from "@/hooks/useReportsData"
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"

export function Cashflow({
  year,
  className,
}: {
  year: string
  className?: string
}) {
  const { isLoading: isDelayedLoading } = useDelayedData()
  const { cashflow, isLoading: isReportsLoading } = useReportsData(year)

  const isLoading = isDelayedLoading || isReportsLoading

  if (isLoading)
    return (
      <Card.Root className="gap-0">
        <Card.Header>
          <Card.Title>Cashflow</Card.Title>
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
  const yearNum = year === "All Time" ? undefined : Number(year)

  let inflow = 0
  let outflow = 0

  if (yearNum) {
    // Specific year
    const yearData = cashflow.find((item) => item.year === yearNum)
    inflow = yearData?.deposits ?? 0
    outflow = Math.abs(yearData?.withdrawals ?? 0)
  } else {
    // All Time: aggregate all years
    inflow = cashflow.reduce((sum, item) => sum + (item.deposits ?? 0), 0)
    outflow = cashflow.reduce(
      (sum, item) => sum + Math.abs(item.withdrawals ?? 0),
      0
    )
  }

  const net = inflow - outflow

  return (
    <Card.Root className={`gap-4 ${className}`}>
      <Card.Header>
        <Card.Title>Cashflow</Card.Title>
        {year === "All Time" && (
          <p className="text-xs text-muted-foreground">All Years Combined</p>
        )}
      </Card.Header>
      <Card.Content className="px-6 pb-6 flex flex-col gap-4">
        {/* Deposits */}
        <div className="flex font-light items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
              <ArrowDownCircle className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">Deposits</p>
          </div>
          <p className="text-md tracking-tight text-emerald-500">
            +{compactNum(inflow)}
          </p>
        </div>

        {/* Withdrawals */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20 transition-colors">
              <ArrowUpCircle className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">Withdrawals</p>
          </div>
          <p className="text-md tracking-tight text-rose-500">
            -{compactNum(outflow)}
          </p>
        </div>

        {/* Net Cashflow */}
        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Net Cashflow</p>
            <p
              className={`text-md ${
                net >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {net >= 0 ? "+" : ""}
              {compactNum(net)}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}
