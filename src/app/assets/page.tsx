"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { useEffect, useState, useCallback } from "react"
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
  const [summaryData, setSummaryData] = useState<AssetSummaryData | null>(null);

  const fetchAssets = useCallback(async () => {
    const response = await fetch('/api/performance/asset-summary');
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
      <Card className="bg-muted/50 shadow-none gap-4">
        <CardHeader>
          <CardTitle>Total Assets</CardTitle>
          <CardDescription>
            What you own
          </CardDescription>
          <CardAction>
            <Popover> 
              <PopoverTrigger>
                <FileChartPie />
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
                />
              </PopoverContent>
            </Popover>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0">
          {!summaryData ? (
            <>
              <SummarySkeleton header={true} />
              <SummarySkeleton />
              <SummarySkeleton />
            </>
          ) : (
            <>
              <SummaryCard
                header={true}
                label="Assets"
                value={assetsTotalAmount}
                link="/assets/holdings"
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
          {!summaryData ? (
            <>
              <SummarySkeleton header={true} />
              <SummarySkeleton />
              <SummarySkeleton header={true} />
              <SummarySkeleton />
            </>
          ) : (
            <>
              <SummaryCard
                header={true}
                label="Liabilities"
                value={liabilitiesTotalAmount}
                link="/assets/debts"
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
  </PageMain>
  )
}