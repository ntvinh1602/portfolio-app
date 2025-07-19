"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { fetcher } from "@/lib/fetcher"
import useSWR from "swr"
import { formatNum } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardHeader,
  CardAction,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileChartPie } from "lucide-react"
import {
  SummaryCard,
  SummarySkeleton
} from "@/components/list-item/single-label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Piechart } from "@/components/charts/piechart"
import { ChartConfig } from "@/components/ui/chart"
import { BottomNavBar } from "@/components/menu/bottom-nav"

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

export default function Page() {
  const { data: summaryData, isLoading, error } = useSWR<AssetSummaryData>('/api/query/asset-summary', fetcher)

  if (error) {
    // You can render a more sophisticated error state here
    return <div>Error loading data</div>;
  }

  const assetsItems = (summaryData?.assets || []).map((item) => ({
    ...item,
    totalAmount: formatNum(item.totalAmount),
  }))
  const assetsTotalAmount = formatNum(summaryData?.totalAssets || 0)

  const liabilitiesItems = (summaryData?.liabilities || []).map((item) => ({
    ...item,
    totalAmount: formatNum(item.totalAmount),
  }))
  const liabilitiesTotalAmount = formatNum(summaryData?.totalLiabilities || 0)

  const equityItems = (summaryData?.equity || []).map((item) => ({
    ...item,
    totalAmount: formatNum(item.totalAmount),
  }))
  const equityTotalAmount = formatNum(summaryData?.totalEquity || 0)

  const chartConfig = {
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

  const chartData = summaryData?.assets?.filter(item => item.totalAmount > 0).map(item => ({
    asset: item.type.toLowerCase(),
    allocation: item.totalAmount,
    fill: `var(--color-${item.type.toLowerCase()})`
  }));

return (
  <PageMain>
    <PageHeader title="Assets" />
    <PageContent>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Total Assets</CardTitle>
          <CardDescription>
            What you own
          </CardDescription>
          <CardAction>
            <Popover> 
              <PopoverTrigger>
                <FileChartPie className="stroke-[1]"/>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="rounded-4xl bg-card/25 backdrop-blur-sm"
              >
                <Piechart 
                  data={chartData}
                  chartConfig={chartConfig}
                  dataKey="allocation"
                  nameKey="asset"
                  legend="bottom"
                  label_pos={1.7}
                />
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <>
              <SummarySkeleton header={true} />
              {Array.from({ length: 4 }).map((_, i) => (
                <SummarySkeleton key={i}/>
              ))}
            </>
          ) : (
            <>
              <SummaryCard
                header={true}
                label="Assets"
                value={assetsTotalAmount}
                link="/holdings"
              />
              {assetsItems.map(item => (
                <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
              ))}
            </>
          )}
        </CardContent>
        <div className="px-6 pb-2">
          <Separator />
        </div>
        <CardHeader>
          <CardTitle>Total Liabilities</CardTitle>
          <CardDescription>
            How you funded your assets
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <SummarySkeleton header={true} />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SummarySkeleton key={i}/>
                  ))}
                </div>
              ))}
            </>
          ) : (
            <>
              <SummaryCard
                header={true}
                label="Liabilities"
                value={liabilitiesTotalAmount}
                link="/debts"
              />
              {liabilitiesItems.map(item => (
                <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
              ))}
              <SummaryCard
                header={true}
                label="Equities"
                value={equityTotalAmount}
              />
              {equityItems.map(item => (
                <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </PageContent>
    <BottomNavBar />
  </PageMain>
  )
}