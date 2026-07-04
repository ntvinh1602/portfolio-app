import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { BSheetView } from "@fund/fund.types"
import { Separator } from "@/components/ui/separator"
import { AumChart } from "@fund/components/chart/aum-chart"
import { LeverageChart } from "@fund/components/chart/leverage-chart"
import { StockHoldings } from "./stock-holdings"
import { Skeleton } from "@/components/ui/skeleton"
import { AssetItemSkeleton } from "@/components/skeletons/item"
import ChartCardSkeleton from "@/components/skeletons/chart-card"

interface Props {
  cash: number
  stock: number
  fund: number
  equity: number
  margin: number
  debt: number
  totalAsset: number
  bsheet: BSheetView[]
}

export function Portfolio({
  cash,
  stock,
  fund,
  equity,
  margin,
  debt,
  totalAsset,
  bsheet,
}: Props) {
  return (
    <Card>
      <StockHoldings bs={bsheet} />
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
