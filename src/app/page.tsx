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
import { CryptoHoldings } from "@/components/cards/crypto-holdings"
import {
  BalanceSheetData,
  EquityChartData,
  BenchmarkChartData,
  PnLData,
  TWRData
} from "@/types/dashboard-data"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import TradingView from "@/components/cards/trading-view"
import { Wallet } from "lucide-react"
import { AssetDataProvider } from "@/context/asset-data-context"
import { Loading } from "@/components/loader"

interface EquityChartProps {
  balanceSheetData: BalanceSheetData | null
  pnlData: PnLData | null
  equityData: {
    all_time: EquityChartData[]
    "1y": EquityChartData[]
    "6m": EquityChartData[]
    "3m": EquityChartData[]
  }
}

interface BenchmarkchartProps {
  twrData: TWRData | null
  cagr: number | null
  benchmarkData: {
    all_time: BenchmarkChartData[]
    "1y": BenchmarkChartData[]
    "6m": BenchmarkChartData[]
    "3m": BenchmarkChartData[]
  }
}

function EquityChart({ balanceSheetData, pnlData, equityData }: EquityChartProps) {
  const [dateRange, setDateRange] = React.useState("1y")
  const chartData = equityData[dateRange as keyof typeof equityData]

  return (
    <>
      {!balanceSheetData ? <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-full" /> :
        <ChartCard
          description="Total Equity"
          majorValue={balanceSheetData?.totalEquity}
          majorValueFormatter={(value) => formatNum(value)}
          minorValue1={pnlData?.mtd ?? null}
          minorValue1Formatter={(value) => `${compactNum(Math.abs(value))}`}
          minorText1="this month"
          minorValue2={pnlData?.ytd ?? null}
          minorValue2Formatter={(value) => `${compactNum(Math.abs(value))}`}
          minorText2="this year"
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
          yAxisTickFormatter={(value) => compactNum(Number(value))}
          tooltipValueFormatter={(value) => formatNum(value)}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      }
    </>
  )
}

function Benchmarkchart({ twrData, cagr, benchmarkData }: BenchmarkchartProps) {
  const [dateRange, setDateRange] = React.useState("1y")
  const chartData = benchmarkData[dateRange as keyof typeof benchmarkData]

   return (
     <>
       {!twrData ? <ChartCardSkeleton cardClassName="gap-2 h-full" chartHeight="h-full" /> :
         <ChartCard
          description="Total Return"
          majorValue={twrData?.all_time}
          majorValueFormatter={(value) => `${formatNum(value * 100, 1)}%`}
          minorValue1={twrData?.ytd}
          minorValue1Formatter={(value) => `${formatNum(value * 100, 1)}%`}
          minorText1="this year"
          minorValue2={cagr}
          minorValue2Formatter={(value) => `${formatNum(value, 1)}%`}
          minorText2="annualized"
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
          legend={true}
          yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
          tooltipValueFormatter={(value) => formatNum(value, 1)}
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
    twrData,
    pnlData,
    equityData,
    benchmarkData,
    balanceSheetData,
    stockData,
    cryptoData,
    cagr
  } = useDashboardData()

 
  return (
    <SidebarProvider>
      <AssetDataProvider
        bsData={balanceSheetData}
        stockData={stockData}
        cryptoData={cryptoData}
        >
        {!isMobile && <AppSidebar />}
        <SidebarInset className={!isMobile ? "px-6" : undefined}>
          <Header title={isMobile ? "Home" : "Dashboard"}/>
          <div className="grid grid-cols-3 px-0 gap-2">
            {isMobile ?
              <Carousel opts={{ align: "center" }} className="w-full col-span-3">
                <CarouselContent className="-ml-2">
                  <CarouselItem className="basis-11/12 pl-8">
                    <EquityChart
                      balanceSheetData={balanceSheetData}
                      pnlData={pnlData}
                      equityData={equityData}
                    />
                  </CarouselItem>
                  <CarouselItem className="basis-11/12 pl-1 pr-6">
                    <Benchmarkchart
                      twrData={twrData}
                      cagr={cagr}
                      benchmarkData={benchmarkData}
                    />
                  </CarouselItem>
                </CarouselContent>
              </Carousel> :
              <div className="flex flex-col col-span-1 gap-2">
                <EquityChart
                  balanceSheetData={balanceSheetData}
                  pnlData={pnlData}
                  equityData={equityData}
                />
                <Benchmarkchart
                  twrData={twrData}
                  cagr={cagr}
                  benchmarkData={benchmarkData}
                />
              </div>
            }
            <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-6 md:px-0">
              <AssetCard sheetSide={isMobile ? "bottom" : "right"} />
              <Card className="gap-2 md:min-h-[700px]">
                <CardHeader className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">Portfolio</CardTitle>
                  <Wallet className="stroke-1 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex flex-col gap-1 md:gap-2">
                  <CardDescription>Stocks</CardDescription>
                  <StockHoldings variant={isMobile ? "compact" : "full"} />
                  <Separator className="mt-4 mb-3"/>
                  <CardDescription>Crypto</CardDescription>
                  <CryptoHoldings variant={isMobile ? "compact" : "full"} />
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-6 md:px-0">
              {!isMobile && <div className="h-[400px]"><TradingView /></div>}
            </div>
          </div>
        </SidebarInset>
        {isMobile && <BottomNavBar />}
      </AssetDataProvider>
    </SidebarProvider>
  )
}
