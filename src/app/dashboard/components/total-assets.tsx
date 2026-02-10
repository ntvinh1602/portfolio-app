import * as Card from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { formatNum } from "@/lib/utils"
import { BalanceSheet } from "./balance-sheet"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"

export function AssetCard() {
  const { data: bsData } = useBalanceSheetData()

  // --- Group by type ---
  const assets = bsData.filter((r) => r.type === "asset")
  const liabilities = bsData.filter((r) => r.type === "liability")
  const equities = bsData.filter((r) => r.type === "equity")

  // --- Totals ---
  const totalAssets = assets.reduce((sum, r) => sum + (r.amount), 0)
  const totalLiabilities = liabilities.reduce((sum, r) => sum + (r.amount), 0)
  const totalEquity = equities.reduce((sum, r) => sum + (r.amount), 0)

  // --- Derived Metrics ---
  const leverage = totalEquity !== 0 ? (totalLiabilities / totalEquity).toFixed(2) : "∞"
  const fund = bsData
    .filter((r) => r.account === "Fund")
    .reduce((sum, r) => sum + (r.amount), 0)
  const liquidity = totalEquity !== 0 ? ((totalEquity - fund) / totalEquity) * 100 : 0

  // --- Asset Chart Config ---
  const assetChartCfg: ChartConfig = Object.fromEntries(
    assets.map((a, i) => [
      (a.account ?? "Unknown").toLowerCase(),
      {
        label: a.account,
        color: `var(--chart-${(i % 4) + 1})`,
      },
    ])
  )

  const assetChartData = assets
    .filter((a) => (a.amount) > 0)
    .map((a, i) => ({
      asset: (a.account ?? "Unknown").toLowerCase(),
      allocation: a.amount,
      fill: `var(--chart-${(i % 4) + 1})`,
    }))

  // --- Liability + Equity Chart Config ---
  const liabilityChartCfg: ChartConfig = {
    equity: {
      label: "Equity",
      color: "var(--chart-1)"
    },
    debts: {
      label: "Debts",
      color: "var(--chart-2)"
    },
    margin: {
      label: "Margin",
      color: "var(--chart-3)"
    },
  }

  const debtsPrincipal = bsData
    .filter((r) => r.account === "Debts Principal")
    .reduce((sum, r) => sum + (r.amount), 0)
  const accruedInterest = bsData
    .filter((r) => r.account === "Accrued Interest")
    .reduce((sum, r) => sum + (r.amount), 0)
  const margin = bsData
    .filter((r) => r.account === "Margin")
    .reduce((sum, r) => sum + (r.amount), 0)

  const liabilityChartData = [
    {
      liability: "equity",
      allocation: totalEquity,
      fill: "var(--chart-1)" },
    {
      liability: "debts",
      allocation: debtsPrincipal + accruedInterest,
      fill: "var(--chart-2)",
    },
    {
      liability: "margin",
      allocation: margin,
      fill: "var(--chart-3)"
    }
  ].filter((d) => d.allocation > 0)
  
  return (
    <Card.Root variant="glow" className="relative flex flex-col gap-0">
      <Card.Header>
        <Card.Subtitle>Assets</Card.Subtitle>
        <Card.Title className="text-2xl">{formatNum(totalAssets)}</Card.Title>
        <Card.Action>
          <BalanceSheet />
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
          valueFormatter={(v) => `${formatNum((v / totalAssets) * 100, 1)}%`}
        />
        
        <Piechart
          data={liabilityChartData}
          chartConfig={liabilityChartCfg}
          dataKey="allocation"
          nameKey="liability"
          className="h-fit w-full"
          innerRadius={70}
          legend="right"
          label={false}
          margin_tb={0}
          centerText="Leverage"
          centerValue={leverage}
          valueFormatter={(v) => `${formatNum((v / totalAssets) * 100, 1)}%`}
        />
      </Card.Content>
    </Card.Root>
  )
}
