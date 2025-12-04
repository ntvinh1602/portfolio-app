import * as Card from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { formatNum } from "@/lib/utils"
import { useLiveData } from "@/app/dashboard/context/live-data-context"
import { BalanceSheet } from "./balance-sheet"
import { Skeleton } from "@/components/ui/skeleton"

export function AssetCard() {
  const {
    totalAssets,
    totalEquity,
    balanceSheet: bs,
    isLoading
  } = useLiveData()

  const assetChartCfg = {
    cash: {
      label: "Cash",
      color: "var(--chart-1)",
    },
    stocks: {
      label: "Stocks",
      color: "var(--chart-2)",
    },
    fund: {
      label: "Fund",
      color: "var(--chart-3)",
    },
    crypto: {
      label: "Crypto",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig

  const assetChartData = bs.assets
    .filter(item => item.totalAmount > 0)
    .map(item => ({
      asset: item.type.toLowerCase(),
      allocation: item.totalAmount,
      fill: `var(--color-${item.type.toLowerCase()})`
  }))

  const liabilityChartCfg = {
    equity: {
      label: "Equity",
      color: "var(--chart-1)",
    },
    debts: {
      label: "Debts",
      color: "var(--chart-2)",
    },
    margin: {
      label: "Margin",
      color: "var(--chart-3)",
    }
  } satisfies ChartConfig

  const liabilityChartData = [
    {
      liability: "equity",
      allocation: bs.totalEquity,
      fill: "var(--chart-1)",
    },
    {
      liability: "debts",
      allocation: (bs.liabilities.find(a => a.type === "Debts Principal")?.totalAmount || 0) + (bs.liabilities.find(a => a.type === "Accrued Interest")?.totalAmount || 0),
      fill: "var(--chart-2)",
    },
    {
      liability: "margin",
      allocation: bs.liabilities.find(a => a.type === "Margin")?.totalAmount || 0,
      fill: "var(--chart-3)",
    }
  ].filter((d) => d.allocation > 0)

  const leverage = bs && bs.totalEquity !== 0
    ? (bs.totalLiabilities / bs.totalEquity).toFixed(2)
    : "Infinite"
  const fund = bs.assets.find(a => a.type === "Fund")?.totalAmount || 0
  const liquidity = ( totalEquity - fund ) / totalEquity * 100


  if (isLoading) return (
    <Card.Root className="gap-0">
      <Card.Header>
        <Card.Subtitle>Total Assets</Card.Subtitle>
        <Skeleton className="h-8 w-40"/>
      </Card.Header>
      <Card.Content className="grid grid-cols-2 items-center h-45">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-40 aspect-square rounded-full" />
            <div className="flex flex-col w-full gap-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-10" />
              ))}
            </div>
          </div>
        ))}
      </Card.Content>
    </Card.Root>
  )

  return (
    <Card.Root className="gap-1">
      <Card.Header>
        <Card.Subtitle>Total Assets</Card.Subtitle>
        <Card.Title className="text-2xl">
          {formatNum(totalAssets)}
        </Card.Title>
        <Card.Action>
          <BalanceSheet/>
        </Card.Action>
      </Card.Header>
      <Card.Content className="px-0 -ml-4 flex w-full justify-between">
        <Piechart
          data={assetChartData}
          chartConfig={assetChartCfg}
          dataKey="allocation"
          nameKey="asset"
          className="h-fit w-full"
          innerRadius={70}
          legend="right"
          label={false}
          margin_tb={0}
          centerText="Liquidity"
          centerValue={`${formatNum(liquidity, 1)}%`}
          valueFormatter={(v) => `${formatNum(v / bs.totalAssets * 100, 1)}%`}
        />
        <Piechart
          data={liabilityChartData}
          chartConfig={liabilityChartCfg}
          dataKey={"allocation"}
          nameKey="liability"
          className="h-fit w-full"
          innerRadius={70}
          legend="right"
          label={false}
          margin_tb={0}
          centerText="Leverage"
          centerValue={leverage}
          valueFormatter={(v) => `${formatNum(v / bs.totalAssets * 100, 1)}%`}

        />
      </Card.Content>
    </Card.Root>
  )
}