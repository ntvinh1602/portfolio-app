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
import { Linechart } from "@/components/charts/linechart"
import TabSwitcher from "@/components/tab-switcher"
import { formatNum, compactNum } from "@/lib/utils"
import { parseISO, format } from "date-fns"
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
  last90DBenchmarkData: BenchmarkChartData[] | null
}

function EquityChart({ assetSummaryData, mtdPnLData, equityData }: EquityChartProps) {
  const [dateRange, setDateRange] = React.useState("all_time")
  const chartData = equityData[dateRange as keyof typeof equityData]

  const getTicks = (data: EquityChartData[], maxTicks: number) => {
    if (data.length <= maxTicks) {
      return data.map(d => d.snapshot_date);
    }
    const ticks = [data[0].snapshot_date];
    const step = (data.length - 1) / (maxTicks - 1);
    for (let i = 1; i < maxTicks - 1; i++) {
      const index = Math.round(i * step);
      if (index < data.length -1) {
        ticks.push(data[index].snapshot_date);
      }
    }
    ticks.push(data[data.length - 1].snapshot_date);
    return ticks;
  };

  const ticks = getTicks(chartData, 5);

  const xAxisTickFormatter = (value: string | number) => {
    if (typeof value !== 'string') {
      return value.toString();
    }
    const date = parseISO(value)
    switch (dateRange) {
      case "1y":
      case "all_time":
        return format(date, "MMM yy")
      default:
        return format(date, "dd MMM")
    }
  }

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
          chartClassName="h--full w-full"
          xAxisDataKey="snapshot_date"
          lineDataKeys={["net_equity_value"]}
          grid={true}
          xAxisTickFormatter={xAxisTickFormatter}
          yAxisTickFormatter={(value) => compactNum(Number(value))}
          ticks={ticks}
        >
          <TabSwitcher
            value={dateRange}
            onValueChange={setDateRange}
            options={[
              { label: "3M", value: "3m" },
              { label: "6M", value: "6m" },
              { label: "1Y", value: "1y" },
              { label: "All Time", value: "all_time" },
            ]}
          />
        </ChartCard>
      }
    </>
  )
}

function Benchmarkchart({ lifetimeReturnData, ytdReturnData, last90DBenchmarkData }: BenchmarkchartProps) {
  return (
    <>
      {!lifetimeReturnData ? <ChartCardSkeleton cardClassName="gap-2 h-full" chartHeight="h-full" /> :
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
          chartData={last90DBenchmarkData ?? []}
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

export default function Page() {
  const isMobile = useIsMobile()
  const {
    ytdReturnData,
    lifetimeReturnData,
    mtdPnLData,
    equityData,
    last90DBenchmarkData,
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
                    last90DBenchmarkData={last90DBenchmarkData}
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
                last90DBenchmarkData={last90DBenchmarkData}
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