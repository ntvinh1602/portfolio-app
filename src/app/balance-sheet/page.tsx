"use client"

import * as React from "react"
import { PageMain } from "@/components/page-main"
import { PageHeader } from "@/components/page-header"
import { PageContainer } from "@/components/page-container"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import {
  CardContent,
  CardHeader,
  CardAction
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Coins,
  CreditCard,
  ChartPie,
} from "lucide-react"
import { SummaryCard } from "@/components/summary-card"
import { SummarySkeleton } from "@/components/summary-skeleton"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Piechart } from "@/components/piechart"
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
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  const fetchAssets = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_asset_summary');

    if (error) {
      console.error('Error fetching asset summary:', error);
      return;
    }

    if (data) {
      setSummaryData(data as AssetSummaryData);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets])

  const assetsItems = (summaryData?.assets || []).map((item) => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount),
  }))
  const assetsTotalAmount = formatCurrency(summaryData?.totalAssets || 0)

  const liabilitiesItems = (summaryData?.liabilities || []).map((item) => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount),
  }))
  const liabilitiesTotalAmount = formatCurrency(summaryData?.totalLiabilities || 0)

  const equityItems = (summaryData?.equity || []).map((item) => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount),
  }))
  const equityTotalAmount = formatCurrency(summaryData?.totalEquity || 0)

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
    <PageHeader title="Balance Sheet" />
    <PageContainer>
      <CardHeader className="flex px-2 items-center justify-between">
        <Button
          variant="default"
          className="font-semibold"
        >
          <Coins />Total Assets
        </Button>
        <CardAction>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <ChartPie />Chart
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="border-border/50 rounded-4xl bg-card/25 backdrop-blur-sm"
            >
              <Piechart 
                data={chartData}
                chartConfig={chartConfig}
                dataKey="allocation"
                nameKey="asset"
              />
            </PopoverContent>
          </Popover>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2">
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
            />
            {assetsItems.map(item => (
              <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
            ))}
          </>
        )}
      </CardContent>
      <CardHeader className="flex px-2 items-center justify-between">
        <Button
          variant="default"
          className="font-semibold"
        >
          <CreditCard />Total Liabilities
        </Button>
      </CardHeader>
      <CardContent className="px-2">
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
    </PageContainer>
  </PageMain>
  )
}