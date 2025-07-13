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
import { Piechart } from "@/components/charts/base-charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { useEffect, useState, useCallback } from "react"
import { formatNum } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

interface SummaryItem {
  type: string;
  totalAmount: number;
}

interface AssetSummaryData {
  assets: SummaryItem[];
  totalAssets: number;
  liabilities: SummaryItem[];
  totalLiabilities: number;
  equity: SummaryItem[];
  totalEquity: number;
}

export function AssetCard() {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/assets")
  }
  const [summaryData, setSummaryData] = useState<AssetSummaryData | null>(null);

  const fetchAssets = useCallback(async () => {
    const response = await fetch('/api/reporting/asset-summary');
    if (!response.ok) {
      console.error('Error fetching asset summary:', response.statusText);
      return;
    }
    const data = await response.json();
    setSummaryData(data as AssetSummaryData);
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets])

  const assetsTotalAmount = formatNum(summaryData?.totalAssets || 0)
  const liabilitiesTotalAmount = summaryData?.totalLiabilities || 0
  const equityTotalAmount = summaryData?.totalEquity || 0
  const leverage = (liabilitiesTotalAmount / equityTotalAmount).toFixed(2)

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

  const assetChartData = summaryData?.assets?.filter(item => item.totalAmount > 0).map(item => ({
    asset: item.type.toLowerCase(),
    allocation: item.totalAmount,
    fill: `var(--color-${item.type.toLowerCase()})`
  }));

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
      allocation: summaryData?.totalEquity ?? 0,
      fill: "var(--chart-1)",
    },
    {
      liability: "liabilities",
      allocation: summaryData?.totalLiabilities ?? 0,
      fill: "var(--chart-2)",
    },
  ].filter((d) => d.allocation > 0)

  return (
    <Card className="pt-2 pb-1 border-none shadow-none bg-background gap-0">
      <CardHeader className="px-8">
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          Total assets<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl font-semibold">
            {assetsTotalAmount ? assetsTotalAmount : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <CardDescription className="text-xs">Leverage</CardDescription>
          <Badge variant="outline">
            {leverage}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex justify-between">
        <div className="flex flex-col">
          <CardDescription>
          </CardDescription>
          <Piechart
            data={assetChartData}
            chartConfig={assetChartCfg}
            dataKey="allocation"
            nameKey="asset"
            className="h-48 w-48 -my-8"
            innerRadius={50}
            legend="right"
            label={false}
          />
        </div>
        <div className="flex flex-col">
          <CardDescription>
          </CardDescription>
          <Piechart
            data={liabilityChartData}
            chartConfig={liabilityChartCfg}
            dataKey="allocation"
            nameKey="liability"
            className="h-48 w-48 -ml-5 -my-8"
            innerRadius={50}
            legend="right"
            label={false}
          />  
        </div>
      </CardContent>
    </Card>
  )
}