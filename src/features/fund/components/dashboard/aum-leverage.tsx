"use client"

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardAction,
} from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { formatNum } from "@/lib/utils"
import { Dock } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"

interface AssetCardProps {
  assets: {
    cash: number
    stock: number
    fund: number
  }
  liabilities: {
    total_equity: number
    total_liabilities: number
    debts: number
    margin: number
  }
}

const innerRadius = 65

export function AumLeverage({ assets: a, liabilities: lb }: AssetCardProps) {
  const totalAssets = lb.total_equity + lb.total_liabilities

  const leverage =
    lb.total_equity !== 0
      ? (lb.total_liabilities / lb.total_equity).toFixed(2)
      : "∞"

  // --- Asset Chart ---
  const assetChartCfg: ChartConfig = {
    cash: {
      label: "Cash",
      color: "var(--chart-1)",
    },
    stock: {
      label: "Stock",
      color: "var(--chart-2)",
    },
    fund: {
      label: "Fund",
      color: "var(--chart-3)",
    },
  }

  const assetChartData = [
    {
      asset: "cash",
      allocation: a.cash,
    },
    {
      asset: "stock",
      allocation: a.stock,
    },
    {
      asset: "fund",
      allocation: a.fund,
    },
  ].filter((d) => d.allocation > 0)

  // --- Liability Chart ---
  const liabilityChartCfg: ChartConfig = {
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
    },
  }

  const liabilityChartData = [
    {
      liability: "equity",
      allocation: lb.total_equity,
    },
    {
      liability: "debts",
      allocation: lb.debts,
    },
    {
      liability: "margin",
      allocation: lb.margin,
    },
  ].filter((d) => d.allocation > 0)

  return (
    <Card>
      <div className="flex flex-1 gap-2">
        <div className="w-full">
          <CardHeader>
            <CardDescription>Total AUM</CardDescription>
            <CardTitle className="text-base sm:text-xl">
              {formatNum(totalAssets)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Piechart
              data={assetChartData}
              chartConfig={assetChartCfg}
              dataKey="allocation"
              nameKey="asset"
              className="w-full max-h-50"
              innerRadius={innerRadius}
              legend="right"
              margin_tb={0}
              valueFormatter={(v) =>
                `${formatNum((v / totalAssets) * 100, 1)}%`
              }
            />
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div className="w-full">
          <CardHeader>
            <CardDescription>Leverage</CardDescription>
            <CardTitle className="text-base sm:text-xl">{leverage}</CardTitle>
            <CardAction>
              <Button variant="outline" size="icon-sm">
                <Dock />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Piechart
              data={liabilityChartData}
              chartConfig={liabilityChartCfg}
              dataKey="allocation"
              nameKey="liability"
              className="w-full max-h-50"
              innerRadius={innerRadius}
              legend="right"
              margin_tb={0}
              valueFormatter={(v) =>
                `${formatNum((v / totalAssets) * 100, 1)}%`
              }
            />
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
