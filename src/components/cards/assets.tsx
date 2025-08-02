"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
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

interface AssetCardProps {
  assetSummaryData: AssetSummaryData | null;
}

export function AssetCard({ assetSummaryData }: AssetCardProps) {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/assets")
  }

  const assetsTotalAmount = formatNum(assetSummaryData?.totalAssets || 0)
  const liabilitiesTotalAmount = assetSummaryData?.totalLiabilities || 0
  const equityTotalAmount = assetSummaryData?.totalEquity || 0
  const leverage = (equityTotalAmount !== 0) ? (liabilitiesTotalAmount / equityTotalAmount).toFixed(2) : "N/A"

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

  const assetChartData = assetSummaryData?.assets?.filter(item => item.totalAmount > 0).map(item => ({
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
      allocation: assetSummaryData?.totalEquity ?? 0,
      fill: "var(--chart-1)",
    },
    {
      liability: "liabilities",
      allocation: assetSummaryData?.totalLiabilities ?? 0,
      fill: "var(--chart-2)",
    },
  ].filter((d) => d.allocation > 0)

  return (
    <Card className="bg-muted/0 py-0 border-none gap-0">
      <CardHeader>
        <CardDescription
          className="flex items-center gap-1 w-fit"
          onClick={handleNavigation}
        >
          Total assets<ChevronRight className="size-4"/>
        </CardDescription>
        <CardTitle className="text-2xl">
            {assetsTotalAmount ? assetsTotalAmount : "Loading..."}
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <CardDescription className="text-xs">Leverage</CardDescription>
          <Badge variant="outline">
            {leverage}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex w-full justify-between">
        <Piechart
          data={assetChartData}
          chartConfig={assetChartCfg}
          dataKey="allocation"
          nameKey="asset"
          className="h-fit w-full"
          innerRadius={50}
          legend="right"
          label={false}
          margin_tb={0}
        />
        <Piechart
          data={liabilityChartData}
          chartConfig={liabilityChartCfg}
          dataKey="allocation"
          nameKey="liability"
          className="h-fit w-full"
          innerRadius={50}
          legend="right"
          label={false}
          margin_tb={0}
        />
      </CardContent>
    </Card>
  )
}

export function AssetCardSkeleton() {
  return (
    <Card className="bg-muted/0 py-0 border-none gap-2">
      <CardHeader>
        <CardDescription className="flex items-center gap-1 w-fit">
          Total assets<ChevronRight className="size-4" />
        </CardDescription>
        <CardTitle className="text-2xl">
          <Skeleton className="h-8 w-32" />
        </CardTitle>
        <CardAction className="flex flex-col gap-1 items-end">
          <CardDescription className="text-xs">
            Leverage
          </CardDescription>
          <Skeleton className="h-5 w-12" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex w-full justify-between gap-2">
        <Skeleton className="h-[150px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </CardContent>
    </Card>
  )
}