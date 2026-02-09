import * as Card from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { formatNum } from "@/lib/utils"
import { BalanceSheet } from "./balance-sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useDelayedData } from "@/hooks/useDelayedData"

export function AssetCard() {
  const { bsData: rows, isLoading } = useDelayedData()

  // Graceful fallback
  const data = Array.isArray(rows) ? rows : []

  // --- Group by type ---
  const assets = data.filter((r) => r.type === "asset")
  const liabilities = data.filter((r) => r.type === "liability")
  const equities = data.filter((r) => r.type === "equity")

  // --- Totals ---
  const totalAssets = assets.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalLiabilities = liabilities.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalEquity = equities.reduce((sum, r) => sum + (r.amount || 0), 0)

  // --- Derived Metrics ---
  const leverage = totalEquity !== 0 ? (totalLiabilities / totalEquity).toFixed(2) : "∞"
  const fund = assets.find((a) => (a.account ?? "Unknown").toLowerCase() === "fund")?.amount || 0
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
    .filter((a) => (a.amount || 0) > 0)
    .map((a, i) => ({
      asset: (a.account ?? "Unknown").toLowerCase(),
      allocation: a.amount,
      fill: `var(--chart-${(i % 4) + 1})`,
    }))

  // --- Liability + Equity Chart Config ---
  const liabilityChartCfg: ChartConfig = {
    equity: { label: "Equity", color: "var(--chart-1)" },
    debts: { label: "Debts", color: "var(--chart-2)" },
    margin: { label: "Margin", color: "var(--chart-3)" },
  }

  const debtsPrincipal =
    liabilities.find((l) => l.account === "Debts Principal")?.amount || 0
  const accruedInterest =
    liabilities.find((l) => l.account === "Accrued Interest")?.amount || 0
  const margin = liabilities.find((l) => l.account === "Margin")?.amount || 0

  const liabilityChartData = [
    { liability: "equity", allocation: totalEquity, fill: "var(--chart-1)" },
    {
      liability: "debts",
      allocation: debtsPrincipal + accruedInterest,
      fill: "var(--chart-2)",
    },
    { liability: "margin", allocation: margin, fill: "var(--chart-3)" },
  ].filter((d) => d.allocation > 0)

  // --- Loading State ---
  if (isLoading)
    return (
      <Card.Root className="gap-0">
        <Card.Header>
          <Card.Subtitle>Assets</Card.Subtitle>
          <Skeleton className="h-8 w-40" />
        </Card.Header>
        <Card.Content className="grid grid-cols-2 items-center h-45">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-40 aspect-square rounded-full" />
              <div className="flex flex-col w-full gap-2">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-10" />
                ))}
              </div>
            </div>
          ))}
        </Card.Content>
      </Card.Root>
    )

  // --- Render ---
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
        {/* Assets Pie Chart */}
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
          valueFormatter={(v) =>
            `${formatNum((v / totalAssets) * 100, 1)}%`
          }
        />

        {/* Liabilities & Equity Pie Chart */}
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
          valueFormatter={(v) =>
            `${formatNum((v / totalAssets) * 100, 1)}%`
          }
        />
      </Card.Content>
    </Card.Root>
  )
}
