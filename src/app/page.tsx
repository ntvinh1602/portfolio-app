"use client"

import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import { ChartCard, ChartCardSkeleton } from "@/components/cards/chart-card"
import { AssetCard } from "@/components/cards/total-assets"
import { Areachart } from "@/components/charts/areachart"
import { formatNum, compactNum } from "@/lib/utils"
import { AssetSummary } from "@/components/cards/asset-summary"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useIsMobile } from "@/hooks/use-mobile"
import { useBTCUSDTPrice } from "@/hooks/use-btcusdt-price"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { StockHoldings } from "@/components/cards/stock-holdings"
import { CryptoHoldings } from "@/components/cards/crypto-holdings"
import {
  AssetSummaryData,
  EquityChartData,
  BenchmarkChartData
} from "@/types/dashboard-data"
import { Card, CardContent, CardDescription } from "@/components/ui/card"

interface EquityChartProps {
  assetSummaryData: AssetSummaryData | null
  mtdPnLData: number | null
  equityData: {
    all_time: EquityChartData[]
    "1y": EquityChartData[]
    "6m": EquityChartData[]
    "3m": EquityChartData[]
  }
}

interface BenchmarkchartProps {
  lifetimeReturnData: number | null
  ytdReturnData: number | null
  benchmarkData: {
    all_time: BenchmarkChartData[]
    "1y": BenchmarkChartData[]
    "6m": BenchmarkChartData[]
    "3m": BenchmarkChartData[]
  }
}

function EquityChart({ assetSummaryData, mtdPnLData, equityData }: EquityChartProps) {
  const [dateRange, setDateRange] = React.useState("1y")
  const chartData = equityData[dateRange as keyof typeof equityData]

  return (
    <>
      {!assetSummaryData ? <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-full" /> :
        <ChartCard
          description="Total Equity"
          descriptionLink="/earnings"
          titleValue={assetSummaryData?.totalEquity}
          titleValueFormatter={(value) => formatNum(value)}
          changeValue={mtdPnLData}
          changeValueFormatter={(value) => `${compactNum(Math.abs(value))}`}
          changePeriod="this month"
          chartComponent={Areachart}
          chartData={chartData}
          chartConfig={{
            net_equity_value: {
              label: "Equity",
              color: "var(--chart-1)",
            },
          }}
          chartClassName="h-full w-full"
          xAxisDataKey="snapshot_date"
          lineDataKeys={["net_equity_value"]}
          grid={true}
          yAxisTickFormatter={(value) => compactNum(Number(value))}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      }
    </>
  )
}

function Benchmarkchart({ lifetimeReturnData, ytdReturnData, benchmarkData }: BenchmarkchartProps) {
  const [dateRange, setDateRange] = React.useState("1y")
  const chartData = benchmarkData[dateRange as keyof typeof benchmarkData]

   return (
     <>
       {!lifetimeReturnData ? <ChartCardSkeleton cardClassName="gap-2 h-full" chartHeight="h-full" /> :
         <ChartCard
           description="Total Return"
           descriptionLink="/metrics"
           titleValue={lifetimeReturnData}
           titleValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
           changeValue={ytdReturnData}
           changeValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
           changePeriod="this year"
           chartComponent={Areachart}
           chartData={chartData}
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
           chartClassName="h-full w-full"
           xAxisDataKey="snapshot_date"
           lineDataKeys={["portfolio_value", "vni_value"]}
           grid={true}
           legend={true}
           yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
           dateRange={dateRange}
           onDateRangeChange={setDateRange}
         />
      }
    </>
  )
}

export default function Page() {
  const isMobile = useIsMobile()
  const {
    ytdReturnData,
    lifetimeReturnData,
    mtdPnLData,
    equityData,
    benchmarkData,
    assetSummaryData,
    stockData,
    cryptoData
  } = useDashboardData()

  const { price: liveBtcPrice } = useBTCUSDTPrice()

  return (
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title={isMobile ? "Home" : "Dashboard"}/>
        <div className="grid grid-cols-3 px-0 gap-4">
          {isMobile ?
            <Carousel opts={{ align: "center" }} className="w-full col-span-3">
              <CarouselContent className="-ml-2">
                <CarouselItem className="basis-11/12 pl-8">
                  <EquityChart
                    assetSummaryData={assetSummaryData}
                    mtdPnLData={mtdPnLData}
                    equityData={equityData}
                  />
                </CarouselItem>
                <CarouselItem className="basis-11/12 pl-1 pr-6">
                  <Benchmarkchart
                    lifetimeReturnData={lifetimeReturnData}
                    ytdReturnData={ytdReturnData}
                    benchmarkData={benchmarkData}
                  />
                </CarouselItem>
              </CarouselContent>
            </Carousel> :
            <div className="flex flex-col col-span-1 gap-2">
              <EquityChart
                assetSummaryData={assetSummaryData}
                mtdPnLData={mtdPnLData}
                equityData={equityData}
              />
              <Benchmarkchart
                lifetimeReturnData={lifetimeReturnData}
                ytdReturnData={ytdReturnData}
                benchmarkData={benchmarkData}
              />
            </div>
          }
          <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-6 md:px-0">
            {isMobile && <AssetCard data={assetSummaryData} />}
            <Card className="border-0 py-0 gap-2">
              {isMobile && <CardDescription>Current Holdings</CardDescription>}
              <CardContent className="flex flex-col px-0 gap-1 md:gap-2">
                <StockHoldings
                  variant={isMobile ? "compact" : "full"}
                  data={stockData}
                />
                <CryptoHoldings
                  variant={isMobile ? "compact" : "full"}
                  data={cryptoData}
                  liveBtcPrice={liveBtcPrice}
                />
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col gap-4 col-span-3 md:col-span-1 px-6 md:px-0">
            {!isMobile && <AssetCard data={assetSummaryData} />}
            {!isMobile && <AssetSummary title={true} data={assetSummaryData} />}
          </div>
        </div>
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}