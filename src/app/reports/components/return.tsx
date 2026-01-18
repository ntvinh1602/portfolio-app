import * as Card from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelayedData } from "@/hooks/useDelayedData"
import { useReportsData } from "@/hooks/useReportsData"
import { Landmark, PiggyBank } from "lucide-react"

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
      <Card.Root className="gap-0">
        <Card.Header>
          <Card.Title>Return</Card.Title>
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
    <Card.Root variant="glow" className={`gap-4 ${className}`}>
      <Card.Header>
        <Card.Title className="text-xl">Return</Card.Title>
      </Card.Header>
      <Card.Content className="px-6 pb-6 flex flex-col gap-4">
        {/* Equity Return */}
        <div className="flex font-light items-center justify-between group">
          <div className="flex items-center gap-3">
            <PiggyBank className="size-5 stroke-1" />
            <p className="text-sm text-muted-foreground">Equity</p>
          </div>
          <p
            className={`text-md tracking-tight ${
              (equityReturn ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {equityReturn !== null
              ? `${equityReturn >= 0 ? "+" : ""}${equityReturn.toFixed(1)}%`
              : "—"}
          </p>
        </div>

        {/* VN-Index Return */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <Landmark className="size-5 stroke-1" />
            <p className="text-sm text-muted-foreground">VN-Index</p>
          </div>
          <p
            className={`text-md tracking-tight ${
              (vnIndexReturn ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {vnIndexReturn !== null
              ? `${vnIndexReturn >= 0 ? "+" : ""}${vnIndexReturn.toFixed(1)}%`
              : "—"}
          </p>
        </div>

        {/* Alpha */}
        <div className="pt-4 border-t border-dashed">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Alpha</p>
            <p
              className={`text-md ${
                (alpha ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {alpha !== null
                ? `${alpha >= 0 ? "+" : ""}${alpha.toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  )
}
