import * as Card from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { formatNum } from "@/lib/utils"
import { useLiveData } from "@/app/dashboard/context/live-data-context"
import { BalanceSheet } from "./balance-sheet"
import { Loading } from "@/components/loader"

export function AssetCard() {
  const {
    totalAssets,
    totalEquity,
    balanceSheet: bs,
    loading
  } = useLiveData()

  const assetChartCfg = {
    allocation: {
      label: "Allocation",
    },
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
    allocation: {
      label: "Allocation",
    },
    equity: {
      label: "Equity",
      color: "var(--chart-1)",
    },
    liabilities: {
      label: "Debts",
      color: "var(--chart-2)",
    }
  } satisfies ChartConfig

  const liabilityChartData = [
    {
      liability: "equity",
      allocation: bs.totalEquity,
      fill: "var(--chart-1)",
    },
    {
      liability: "liabilities",
      allocation: bs.totalLiabilities,
      fill: "var(--chart-2)",
    },
  ].filter((d) => d.allocation > 0)

  const leverage = bs && bs.totalEquity !== 0
    ? (bs.totalLiabilities / bs.totalEquity).toFixed(2)
    : "Infinite"
  const fund = bs.assets.find(a => a.type === "Fund")?.totalAmount || 0
  const liquidity = ( totalEquity - fund ) / totalEquity * 100


  if (loading) return (
    <Card.Root className="gap-0">
      <Card.Header>
        <Card.Subtitle>Total Assets</Card.Subtitle>
        <Card.Title className="text-2xl animate-pulse">Loading...</Card.Title>
      </Card.Header>
      <Card.Content className="flex justify-center items-center h-45">
        <Loading/>
        <Loading/>  
      </Card.Content>
    </Card.Root>
  )

  return (
    <Card.Root className="gap-0">
      <Card.Header>
        <Card.Subtitle>Total Assets</Card.Subtitle>
        <Card.Title className="text-2xl">
          {formatNum(totalAssets)}
        </Card.Title>
        <Card.Action>
          <BalanceSheet/>
        </Card.Action>
      </Card.Header>
      <Card.Content className="px-0 flex w-full justify-between">
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
          valueFormatter={(value) => formatNum(value)}
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
          valueFormatter={(value) => formatNum(value)}

        />
      </Card.Content>
    </Card.Root>
  )
}