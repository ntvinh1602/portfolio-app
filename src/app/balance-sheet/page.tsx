"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { PageHeader } from "@/components/page-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState, useCallback } from "react"
import { formatCurrency } from "@/lib/utils"
import { PageInfo } from "@/components/page-info"
import { Badge } from "@/components/ui/badge"
import { PageContainer } from "@/components/page-container"
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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <PageHeader title="Balance Sheet" onInfoClick={() => setIsInfoOpen(true)} />
        <PageInfo
          open={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          title="Understand your Balance Sheet"
        >
          <p className="text-justify">Balance Sheet gives you a complete financial snapshot of your investments. It shows you two important sides of the same coin: <b>Assets</b> and <b>Liabilities</b>.
          <br/><br/>
          <b>Total Assets: What you own.</b> This tab lists all the valuable things in your portfolio, such as cash, stocks, crypto, bonds, funds etc.
          <br/><br/>
          <b>Total Liabilities: Where the money came from.</b> This tab shows how your assets were funded.
          <br/><br/>
          <b>Liabilities</b> is what you owe. This is the portion of your portfolio funded by borrowed money, such as bank loans or margin loans from your broker.
          <br/><br/>
          <b>Equities</b> is what you truly own. It represents your personal stake and include two parts: <b>Paid-in Capital</b>: money contributed from your own pocket and <b>Retained Earnings</b>: profits your investments generated.
          <br/><br/>
          The fundamental rule is that everything must balance out:</p>
          <br/>
          <p className="text-center">
            <Badge variant="secondary">Total Assets</Badge>
            <b> = </b>
            <Badge variant="destructive">Liabilities</Badge>
            <b> + </b>
            <Badge variant="default">Equities</Badge>
          </p>
          <br/>
          <p className="text-justify">By looking at both sides, you can see not just what you have, but how you are building it. Your <b>Equity</b> is your true net worth within this portfolio, and watching it grows is the ultimate goal.
          </p>
        </PageInfo>

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
      </SidebarInset>
    </SidebarProvider>
  )
}