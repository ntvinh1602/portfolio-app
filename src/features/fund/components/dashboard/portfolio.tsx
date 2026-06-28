"use client"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Asset } from "@fund/fund.types"
import { Separator } from "@/components/ui/separator"
import { AumChart } from "@fund/components/chart/aum-chart"
import { LeverageChart } from "@fund/components/chart/leverage-chart"
import { StockHoldings } from "./stock-holdings"
import { Skeleton } from "@/components/ui/skeleton"
import { AssetItemSkeleton } from "@/components/skeletons/item"
import ChartCardSkeleton from "@/components/skeletons/chart-card"

export function Portfolio({ data }: { data: Asset[] }) {
  const equity = data
    .filter((r) => r.asset_class === "equity")
    .reduce((sum, r) => sum + r.total_value, 0)

  const cash = data
    .filter((r) => r.asset_class == "cash")
    .reduce((sum, r) => sum + r.total_value, 0)

  const stock = data
    .filter((r) => r.asset_class == "stock")
    .reduce((sum, r) => sum + r.total_value, 0)

  const fund = data
    .filter((r) => r.asset_class == "fund")
    .reduce((sum, r) => sum + r.total_value, 0)

  const margin = data.find((r) => r.ticker == "MARGIN")?.total_value || 0
  const totalAsset = cash + stock + fund
  const debt = totalAsset - equity - margin

  return (
    <Card>
      <StockHoldings bs={data} />
      <div className="flex flex-1">
        <AumChart
          cash={cash}
          stock={stock}
          fund={fund}
          totalAsset={totalAsset}
        />
        <Separator orientation="vertical" />
        <LeverageChart
          equity={equity}
          debt={debt}
          margin={margin}
          totalAsset={totalAsset}
        />
      </div>
    </Card>
  )
}

export function PortfolioSkeleton() {
  return (
    <div className="flex flex-col w-full gap-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Portfolio</CardTitle>
          <CardAction>
            <Skeleton className="size-9 w-40 rounded-full" />
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-2">
          <AssetItemSkeleton />
          <AssetItemSkeleton />
          <AssetItemSkeleton />
        </CardContent>
      </Card>
      <div className="flex w-full gap-4">
        <ChartCardSkeleton showMetricsSection={false} />
        <ChartCardSkeleton showMetricsSection={false} />
      </div>
    </div>
  )
}
