import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { BSheetView } from "@fund/fund.types"
import { Separator } from "@/components/ui/separator"
import { AumChart } from "@/features/fund/components/ui/aum-chart"
import { LeverageChart } from "@/features/fund/components/ui/leverage-chart"
import { StockHoldings } from "../dashboard/stock-holdings"
import { Skeleton } from "@/components/ui/skeleton"
import { AssetItemSkeleton } from "@/components/skeletons/item"
import {
  FullChartSkeleton,
  SimpleChartSkeleton,
} from "@/components/skeletons/chart-card"
import StatusLabel from "@/components/status-label"

interface Props {
  normalizedCash: number
  stock: number
  fund: number
  equity: number
  margin: number
  debt: number
  totalAsset: number
  bsheet: BSheetView[]
}

export function Portfolio({
  normalizedCash,
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
          cash={normalizedCash}
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
        <SimpleChartSkeleton name="Total AUM">
          <StatusLabel type="loading" />
        </SimpleChartSkeleton>
        <SimpleChartSkeleton name="Leverage">
          <StatusLabel type="loading" />
        </SimpleChartSkeleton>
      </div>
    </div>
  )
}
