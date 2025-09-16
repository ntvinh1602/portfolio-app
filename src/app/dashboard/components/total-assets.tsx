"use client"

import * as React from "react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { compactNum, formatNum } from "@/lib/utils"
import { useAssetData } from "@/context/asset-data-context"
import { BalanceSheet } from "./balance-sheet"
import { Loading } from "@/components/loader"

export function AssetCard() {
  const {
    totalAssets,
    totalEquity,
    balanceSheet: bs,
    loading
  } = useAssetData()

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
    epf: {
      label: "EPF",
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
  const epf = bs.assets.find(a => a.type === "EPF")?.totalAmount || 0
  const liquidity = ( totalEquity - epf ) / totalEquity * 100


  if (loading) return (
    <Card className="gap-0">
      <CardHeader>
        <CardDescription>Total Assets</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center items-center">
        <Loading/>
        <Loading/>  
      </CardContent>
    </Card>
  )

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardDescription>Total Assets</CardDescription>
        <CardTitle className="text-2xl">
          {formatNum(totalAssets)}
        </CardTitle>
        <CardAction>
          <BalanceSheet/>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 flex w-full justify-between">
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
      </CardContent>
    </Card>
  )
}