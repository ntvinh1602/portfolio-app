import { Card, CardContent } from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { compactNum, formatNum } from "@/lib/utils"
import { useDashboard } from "@/hooks"

export function AssetCard() {
  const { data: dashboard } = useDashboard()

  const assetChartCfg: ChartConfig = {
    cash: {
      label: "Cash",
      color: "var(--chart-1)"
    },
    stock: {
      label: "Stock",
      color: "var(--chart-2)"
    },
    fund: {
      label: "Fund",
      color: "var(--chart-3)"
    },
  }

  const assetChartData = [
    {
      asset: "cash",
      allocation: dashboard.cash,
      fill: "var(--chart-1)"
    },
    {
      asset: "stock",
      allocation: dashboard.stock,
      fill: "var(--chart-2)",
    },
    {
      asset: "fund",
      allocation: dashboard.fund,
      fill: "var(--chart-3)"
    }
  ].filter((d) => d.allocation > 0)


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
      allocation: dashboard.total_equity,
      fill: "var(--chart-1)" },
    {
      liability: "debts",
      allocation: dashboard.debts,
      fill: "var(--chart-2)",
    },
    {
      liability: "margin",
      allocation: dashboard.margin,
      fill: "var(--chart-3)"
    }
  ].filter((d) => d.allocation > 0)

  const leverage = dashboard.total_equity !== 0
    ? (dashboard.total_liabilities / dashboard.total_equity).toFixed(2)
    : "∞"
  const totalAssets = dashboard.total_liabilities + dashboard.total_equity
  
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
