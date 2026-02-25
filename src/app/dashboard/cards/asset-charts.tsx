import { Card, CardContent } from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { compactNum, formatNum } from "@/lib/utils"

interface AssetBreakdown {
  cash: number
  stock: number
  fund: number
}

interface LiabilityBreakdown {
  total_equity: number
  total_liabilities: number
  debts: number
  margin: number
}

interface AssetCardProps {
  assets: AssetBreakdown
  liabilities: LiabilityBreakdown
}

export function AssetCard({
  assets,
  liabilities
}: AssetCardProps) {
  const totalAssets = liabilities.total_equity + liabilities.total_liabilities

  const leverage = liabilities.total_equity !== 0
    ? (
        liabilities.total_liabilities /
        liabilities.total_equity
      ).toFixed(2)
    : "∞"

  // --- Asset Chart ---
  const assetChartCfg: ChartConfig = {
    cash: { label: "Cash", color: "var(--chart-1)" },
    stock: { label: "Stock", color: "var(--chart-2)" },
    fund: { label: "Fund", color: "var(--chart-3)" }
  }

  const assetChartData = [
    { asset: "cash", allocation: assets.cash, fill: "var(--chart-1)" },
    { asset: "stock", allocation: assets.stock, fill: "var(--chart-2)" },
    { asset: "fund", allocation: assets.fund, fill: "var(--chart-3)" }
  ].filter((d) => d.allocation > 0)

  // --- Liability Chart ---
  const liabilityChartCfg: ChartConfig = {
    equity: { label: "Equity", color: "var(--chart-1)" },
    debts: { label: "Debts", color: "var(--chart-2)" },
    margin: { label: "Margin", color: "var(--chart-3)" }
  }

  const liabilityChartData = [
    {
      liability: "equity",
      allocation: liabilities.total_equity,
      fill: "var(--chart-1)"
    },
    {
      liability: "debts",
      allocation: liabilities.debts,
      fill: "var(--chart-2)"
    },
    {
      liability: "margin",
      allocation: liabilities.margin,
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
          valueFormatter={(v) =>
            `${formatNum((v / totalAssets) * 100, 1)}%`
          }
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
          valueFormatter={(v) =>
            `${formatNum((v / totalAssets) * 100, 1)}%`
          }
        />
      </CardContent>
    </Card>
  )
}