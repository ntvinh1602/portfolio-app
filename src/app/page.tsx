"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import { ChartCard, ChartCardSkeleton } from "@/components/cards/chart-card"
import { AssetCard, AssetCardSkeleton } from "@/components/cards/assets"
import { Areachart } from "@/components/charts/areachart"
import { Linechart } from "@/components/charts/linechart"
import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { HoldingsCompact, HoldingsCompactSkeleton } from "@/components/cards/holdings"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useIsMobile } from "@/hooks/use-mobile"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SummaryCard,
  SummarySkeleton
} from "@/components/list-item/single-label"

interface SummaryItem {
  type: string
  totalAmount: number
}

export default function Page() {
  const isMobile = useIsMobile()
  const {
    ytdReturnData,
    lifetimeReturnData,
    mtdPnLData,
    equityData,
    last90DBenchmarkData,
    assetSummaryData: summaryData,
    holdingsData,
    isLoading,
    error,
  } = useDashboardData()
  
    const assetsItems = (summaryData?.assets || []).map((item: SummaryItem) => ({
      ...item,
      totalAmount: formatNum(item.totalAmount),
    }))
    const assetsTotalAmount = formatNum(summaryData?.totalAssets || 0)
  
    const liabilitiesItems = (summaryData?.liabilities || []).map((item: SummaryItem) => ({
      ...item,
      totalAmount: formatNum(item.totalAmount),
    }))
    const liabilitiesTotalAmount = formatNum(summaryData?.totalLiabilities || 0)
  
    const equityItems = (summaryData?.equity || []).map((item: SummaryItem) => ({
      ...item,
      totalAmount: formatNum(item.totalAmount),
    }))
    const equityTotalAmount = formatNum(summaryData?.totalEquity || 0)


  function EquityChart() {
    return (
      <>
        {isLoading ? <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-[180px]" /> :
          <ChartCard
            description="Total Equity"
            descriptionLink="/earnings"
            titleValue={summaryData?.totalEquity}
            titleValueFormatter={(value) => formatNum(value)}
            changeValue={mtdPnLData}
            changeValueFormatter={(value) => `${compactNum(Math.abs(value))}`}
            changePeriod="this month"
            chartComponent={Areachart}
            chartData={equityData}
            chartConfig={{
              net_equity_value: {
                label: "Equity",
                color: "var(--chart-1)",
              },
            }}
            chartClassName="h-full w-full -ml-4"
            xAxisDataKey="date"
            lineDataKeys={["net_equity_value"]}
            grid={true}
            xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
            yAxisTickFormatter={(value) => compactNum(Number(value))}
          />
        }
      </>
    )
  }

  function Benchmarkchart() {
    return (
      <>
        {isLoading ? <ChartCardSkeleton cardClassName="gap-2 h-full" chartHeight="h-[210px]" /> :
          <ChartCard
            cardClassName="gap-2 h-full"
            description="Lifetime Return"
            descriptionLink="/metrics"
            titleValue={lifetimeReturnData}
            titleValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
            changeValue={ytdReturnData}
            changeValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
            changePeriod="this year"
            chartComponent={Linechart}
            chartData={last90DBenchmarkData}
            chartConfig={{
              portfolio_value: {
                label: "Equity",
                color: "var(--chart-1)",
              },
              vni_value: {
                label: "VN-Index",
                color: "var(--chart-2)",
              },
            }}
            chartClassName="h-full w-full -ml-4"
            xAxisDataKey="date"
            lineDataKeys={["portfolio_value", "vni_value"]}
            grid={true}
            legend={true}
            xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
            yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
          />
        }
      </>
    )
  }

  function AssetSummary() {
    return (
      <Card className="px-4">
        <div className="flex flex-col gap-2">
          <CardHeader className="px-0">
            <CardTitle className="font-thin text-muted-foreground text-sm">
              Balance Sheet
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {isLoading ? (
              <>
                <SummarySkeleton header={true} label="Assets"/>
                {Array.from(["Cash","Stocks","EPF","Crypto"]).map((label) => (
                  <SummarySkeleton key={label} label={label}/>
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
                {assetsItems.map((item: { type: string; totalAmount: string }) => (
                  <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
                ))}
              </>
            )}
          </CardContent>
          <Separator className="mb-4"/>
          <CardContent className="px-0">
            {isLoading ? (
              <>
                <SummarySkeleton header={true} label="Liabilities"/>
                {Array.from(["Loans Payable", "Margins Payable", "Accrued Interest"]).map((label, i) => (
                  <SummarySkeleton key={i} label={label}/>
                ))}
                <SummarySkeleton header={true} label="Equities"/>
                {Array.from(["Paid-in Capital", "Retained Earnings", "Unrealized P/L"]).map((label, i) => (
                  <SummarySkeleton key={i} label={label}/>
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
                {liabilitiesItems.map((item: { type: string; totalAmount: string }) => (
                  <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
                ))}
                <SummaryCard
                  header={true}
                  label="Equities"
                  value={equityTotalAmount}
                />
                {equityItems.map((item: { type: string; totalAmount: string }) => (
                  <SummaryCard key={item.type} label={item.type} value={item.totalAmount} />
                ))}
              </>
            )}
          </CardContent>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <SidebarProvider>
        {!isMobile && <AppSidebar />}
        <SidebarInset>
        <Header title="Home"/>
        <div className="flex items-center justify-center h-full text-red-500">
          Error: {error}
        </div>
        {isMobile && <BottomNavBar />}
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset>
        <div className="md:w-3/4 md:mx-auto">
          <Header title="Home"/>
          <div className="grid grid-cols-3 px-0 gap-4">
            <div className="flex flex-col gap-4 col-span-3 md:col-span-1">
              {isMobile ?
                <Carousel
                  opts={{ align: "center" }}
                  className="w-full col-span-3 md:col-span-2"
                >
                  <CarouselContent className="-ml-2 h-[300px]">
                    <CarouselItem className="basis-11/12 md:basis-1/2 pl-8">
                      <EquityChart />
                    </CarouselItem>
                    <CarouselItem className="basis-11/12 md:basis-1/2 pl-1 pr-6">
                      <Benchmarkchart />
                    </CarouselItem>
                  </CarouselContent>
                </Carousel> :
                <div className="flex flex-col gap-1">
                  <EquityChart />
                  <Benchmarkchart />
                </div>
              }
            </div>
            <div className="flex flex-col col-span-3 md:col-span-1 gap-4 md:gap-8">
              <div className="h-[180px] -mb-5">
                {isLoading
                  ? <AssetCardSkeleton />
                  : <AssetCard assetSummaryData={summaryData} />
                }
              </div>
              {isLoading
                ? <HoldingsCompactSkeleton />
                : <HoldingsCompact
                    variant={isMobile ? "compact" : "full"}
                    stockHoldings={holdingsData.stockHoldings}
                    cryptoHoldings={holdingsData.cryptoHoldings}
                  />
              }
            </div>
            <div className="col-span-3 md:col-span-1 px-6 md:px-0">
              {!isMobile && <AssetSummary />}
            </div>
          </div>
        </div>
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}