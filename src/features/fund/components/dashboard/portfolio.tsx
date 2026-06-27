"use client"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import RefreshButton from "./refresh-button"
import type { Asset } from "@fund/fund.types"
import StatusLabel from "@/components/status-label"
import { Piechart } from "@/components/charts/piechart"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { assetChart, liabilityChart } from "@fund/config"
import { ButtonGroup } from "@/components/ui/button-group"
import AssetItem from "@fund/components/asset-item"

interface Props {
  bs: Asset[]
  liability: number
  equity: number
  cash: number
  stock: number
  fund: number
  debt: number
  margin: number
}

export function Portfolio({
  bs,
  liability,
  equity,
  cash,
  stock,
  fund,
  debt,
  margin,
}: Props) {
  const sortedStocks = [...bs]
    .filter((a) => a.asset_class == "stock")
    .sort((a, b) => b.total_value - a.total_value)
  const asset = liability + equity
  const leverage = equity !== 0 ? (liability / equity).toFixed(2) : "∞"

  // --- Asset Chart ---
  const assetChartData = [
    {
      asset: "cash",
      allocation: cash,
    },
    {
      asset: "stock",
      allocation: stock,
    },
    {
      asset: "fund",
      allocation: fund,
    },
  ].filter((d) => d.allocation > 0)

  // --- Liability Chart ---
  const liabilityChartData = [
    {
      liability: "equity",
      allocation: equity,
    },
    {
      liability: "debts",
      allocation: debt,
    },
    {
      liability: "margin",
      allocation: margin,
    },
  ].filter((d) => d.allocation > 0)
  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Portfolio</CardTitle>
        <CardAction className="flex gap-3 ">
          <ButtonGroup>
            <RefreshButton />
            <Button variant="outline" asChild>
              <Link href="/fund/dashboard/balance-sheet">
                B. Sheet<ArrowRight />
              </Link>
            </Button>
          </ButtonGroup>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {sortedStocks.length > 0 ? (
          sortedStocks.map((bs) => (
            <AssetItem
              variant="dashboard"
              key={bs.ticker}
              ticker={bs.ticker}
              name={bs.name}
              asset_class={bs.asset_class}
              currency_code={bs.currency_code}
              logo_url={bs.logo_url}
              quantity={bs.quantity}
              total_value={bs.total_value}
              mkt_price={bs.mkt_price}
              net_profit={bs.net_profit}
            />
          ))
        ) : (
          <StatusLabel type="empty" />
        )}
      </CardContent>
      <div className="flex flex-1 gap-2">
        <div className="w-full">
          <CardHeader>
            <CardDescription>Total AUM</CardDescription>
            <CardTitle className="text-base sm:text-xl">
              {formatNum(liability + equity)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Piechart
              data={assetChartData}
              chartConfig={assetChart}
              dataKey="allocation"
              nameKey="asset"
              className="w-full max-h-50"
              innerRadius={65}
              legend="right"
              margin_tb={0}
              valueFormatter={(v) => `${formatNum((v / asset) * 100, 1)}%`}
            />
          </CardContent>
        </div>
        <Separator orientation="vertical" />
        <div className="w-full">
          <CardHeader>
            <CardDescription>Leverage</CardDescription>
            <CardTitle className="text-base sm:text-xl">{leverage}</CardTitle>
            <CardAction></CardAction>
          </CardHeader>
          <CardContent>
            <Piechart
              data={liabilityChartData}
              chartConfig={liabilityChart}
              dataKey="allocation"
              nameKey="liability"
              className="w-full max-h-50"
              innerRadius={65}
              legend="right"
              margin_tb={0}
              valueFormatter={(v) => `${formatNum((v / asset) * 100, 1)}%`}
            />
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
