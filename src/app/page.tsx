"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import { ChartCard, ChartCardSkeleton } from "@/components/cards/chart-card"
import { AssetCard } from "@/components/cards/total-assets"
import { Areachart } from "@/components/charts/areachart"
import { Linechart } from "@/components/charts/linechart"
import { formatNum, compactNum } from "@/lib/utils"
import { format } from "date-fns"
import { AssetSummary } from "@/components/cards/asset-summary"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { StockHoldings } from "@/components/cards/stock-holdings"
import { Separator } from "@/components/ui/separator"
import { CryptoHoldings } from "@/components/cards/crypto-holdings"

export default function Page() {
  const isMobile = useIsMobile()
  const {
    ytdReturnData,
    lifetimeReturnData,
    mtdPnLData,
    equityData,
    last90DBenchmarkData,
    assetSummaryData,
    holdingsData,
  } = useDashboardData()
  
  function EquityChart() {
    return (
      <>
        {!assetSummaryData ? <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-[180px]" /> :
          <ChartCard
            description="Total Equity"
            descriptionLink="/earnings"
            titleValue={assetSummaryData?.totalEquity}
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
        {!lifetimeReturnData ? <ChartCardSkeleton cardClassName="gap-2 h-full" chartHeight="h-[210px]" /> :
          <ChartCard
            cardClassName="gap-2 h-full"
            description="Total Return"
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

  return (
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title={isMobile ? "Home" : "Dashboard"}/>
        <div className="grid grid-cols-3 px-0 gap-4">
          {isMobile ?
            <Carousel opts={{ align: "center" }} className="w-full col-span-3">
              <CarouselContent className="-ml-2 h-[300px]">
                <CarouselItem className="basis-11/12 pl-8">
                  <EquityChart />
                </CarouselItem>
                <CarouselItem className="basis-11/12 pl-1 pr-6">
                  <Benchmarkchart />
                </CarouselItem>
              </CarouselContent>
            </Carousel> :
            <div className="flex flex-col col-span-1 gap-2">
              <EquityChart />
              <Benchmarkchart />
            </div>
          }
          <div className="flex flex-col gap-4 col-span-3 md:col-span-1 px-6 md:px-0">
            <AssetCard data={assetSummaryData} />
            <Separator />
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Stock Holdings</span>
              <StockHoldings
                variant={isMobile ? "compact" : "full"}
                data={holdingsData?.stockHoldings ?? null}
              />
              <span className="text-sm text-muted-foreground">Crypto Holdings</span>
              <CryptoHoldings
                variant={isMobile ? "compact" : "full"}
                data={holdingsData?.cryptoHoldings ?? null}
              />
            </div>
          </div>
          {!isMobile && <AssetSummary title={true} data={assetSummaryData} />}
        </div>
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}