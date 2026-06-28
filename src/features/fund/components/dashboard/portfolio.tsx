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

interface Props {
  bs: Asset[]
  liability: number
  equity: number
  cash: number
  stock: number
  fund: number
  debt: number
  margin: number
}

export function Portfolio({
  bs,
  liability,
  equity,
  cash,
  stock,
  fund,
  debt,
  margin,
}: Props) {
  const totalAsset = liability + equity

  return (
    <Card>
      <StockHoldings bs={bs} />
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
