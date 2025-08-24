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
import { AssetSummaryData } from "@/types/api-response"

interface AssetCardProps {
  data: AssetSummaryData | null;
}

export function AssetCard({ data }: AssetCardProps) {
  const router = useRouter()
  const handleNavigation = () => {
    router.push("/assets")
  }

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

  const assetChartData = data?.assets?.filter(item => item.totalAmount > 0).map(item => ({
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
      allocation: data?.totalEquity ?? 0,
      fill: "var(--chart-1)",
    },
    {
      liability: "liabilities",
      allocation: data?.totalLiabilities ?? 0,
      fill: "var(--chart-2)",
    },
  ].filter((d) => d.allocation > 0)

  return (
    <>
      {data ?
        <Card className="bg-muted/0 py-0 border-none gap-0">
          <CardHeader className="px-0">
            <CardDescription
              className="flex items-center w-fit"
              onClick={handleNavigation}
            >
              Total Assets<ChevronRight className="size-4"/>
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNum(data.totalAssets)}
            </CardTitle>
            <CardAction className="flex flex-col gap-1 items-end">
              <CardDescription className="text-xs">Leverage</CardDescription>
              <Badge variant="outline">
                {(data.totalEquity !== 0)
                  ? (data.totalLiabilities / data.totalEquity).toFixed(2)
                  : "Infinite"
                }
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 flex w-full justify-between">
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
        </Card> : /* Skeleton */
        <Card className="bg-muted/0 py-0 border-none gap-2">
          <CardHeader className="md:px-0">
            <CardDescription className="flex items-center w-fit">
              Total assets
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
          <CardContent className="md:px-0 flex w-full justify-between gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="grid grid-cols-2">
                <Skeleton className="h-[150px] aspect-square rounded-full" />
                <div className="flex flex-col items-center justify-center gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-[15px] w-2/3 rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      }
    </>
  )
}