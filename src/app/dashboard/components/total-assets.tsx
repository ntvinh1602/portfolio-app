import { Card, CardContent } from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { compactNum, formatNum } from "@/lib/utils"
import { useBalanceSheetData } from "@/hooks/useBalanceSheet"

export function AssetCard() {
  const {
    bsData,
    totalAssets,
    totalLiabilities,
    totalEquity,
  } = useBalanceSheetData()
  
  const assets = bsData.filter((r) => r.asset_class != "equity" && r.asset_class !== "liability")

  // --- Derived Metrics ---
  const debtsPrincipal = bsData
    .filter((r) => r.ticker === "DEBTS")
    .reduce((sum, r) => sum + (r.total_value), 0)
  const accruedInterest = bsData
    .filter((r) => r.ticker === "INTERESTS")
    .reduce((sum, r) => sum + (r.total_value), 0)
  const margin = bsData
    .filter((r) => r.ticker === "MARGIN")
    .reduce((sum, r) => sum + (r.total_value), 0)
  const leverage = totalEquity !== 0
    ? (totalLiabilities / totalEquity).toFixed(2)
    : "∞"

  // --- Asset Chart Config ---
  const assetChartCfg: ChartConfig = Object.fromEntries(
    assets.map((a, i) => [
      (a.asset_class ?? "Unknown"),
      {
        label: a.asset_class.charAt(0).toUpperCase() + a.asset_class.slice(1),
        color: `var(--chart-${(i % 4) + 1})`,
      },
    ])
  )

  const assetChartData = assets
    .filter((a) => (a.total_value) > 0)
    .map((a, i) => ({
      asset: (a.asset_class ?? "Unknown").toLowerCase(),
      allocation: a.total_value,
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
    <Card className="flex min-h-60 py-0 border-0 rounded-none bg-transparent">
      <CardContent className="flex h-full justify-between p-0 pb-4">
        <Piechart
          data={assetChartData}
          chartConfig={assetChartCfg}
          dataKey="allocation"
          nameKey="asset"
          className="h-full w-fit"
          innerRadius={65}
          legend="bottom"
          label={false}
          margin_tb={0}
          centerText="Total AUM"
          centerValue={compactNum(totalAssets)}
          valueFormatter={(v) => `${formatNum((v / totalAssets) * 100, 1)}%`}
        />
        <Piechart
          data={liabilityChartData}
          chartConfig={liabilityChartCfg}
          dataKey="allocation"
          nameKey="liability"
          className="h-full w-fit"
          innerRadius={65}
          legend="bottom"
          label={false}
          margin_tb={0}
          centerText="Leverage"
          centerValue={leverage}
          valueFormatter={(v) => `${formatNum((v / totalAssets) * 100, 1)}%`}
        />
      </CardContent>
    </Card>
  )
}
