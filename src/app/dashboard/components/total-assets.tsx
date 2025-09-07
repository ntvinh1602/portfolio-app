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
  const { totalAssets, totalEquity, balanceSheet, loading } = useAssetData()

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

  const assetChartData = balanceSheet.assets
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
      allocation: balanceSheet.totalEquity,
      fill: "var(--chart-1)",
    },
    {
      liability: "liabilities",
      allocation: balanceSheet.totalLiabilities,
      fill: "var(--chart-2)",
    },
  ].filter((d) => d.allocation > 0)

  const leverage = balanceSheet && balanceSheet.totalEquity !== 0
    ? (balanceSheet.totalLiabilities / balanceSheet.totalEquity).toFixed(2)
    : "Infinite"

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
          centerText="Liquid Eqty."
          centerValue={
            compactNum(totalEquity - (balanceSheet.assets.find(a => a.type === "EPF")?.totalAmount ?? 0
          ))}
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