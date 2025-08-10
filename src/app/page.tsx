"use client"

import BitcoinPriceFeed from '@/components/BitcoinPriceFeed'
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
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

export default function Page() {
  const {
    ytdReturnData,
    lifetimeReturnData,
    mtdPnLData,
    equityData,
    last90DBenchmarkData,
    assetSummaryData,
    holdingsData,
    isLoading,
    error,
  } = useDashboardData();

  if (error) {
    return (
      <PageMain>
        <PageHeader title="Error" />
        <PageContent className="px-0">
          <div className="flex items-center justify-center h-full text-red-500">
            Error: {error}
          </div>
        </PageContent>
        <BottomNavBar />
      </PageMain>
    )
  }

  return (
    <PageMain>
      <PageHeader title="Home" />
      <PageContent className="px-0 gap-4">
        <Carousel opts={{ align: "center" }} className="w-full">
          <CarouselContent className="-ml-2 h-[300px]">
            <CarouselItem className="basis-11/12 pl-8">
              {isLoading ? <ChartCardSkeleton cardClassName="gap-4 h-full" chartHeight="h-[180px]" /> :
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
                  chartClassName="h-[180px] w-full -ml-4"
                  xAxisDataKey="date"
                  lineDataKeys={["net_equity_value"]}
                  grid={true}
                  xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
                  yAxisTickFormatter={(value) => compactNum(Number(value))}
                />
              }
            </CarouselItem>
            <CarouselItem className="basis-11/12 pl-1 pr-6">
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
                  chartClassName="h-[200px] w-full -ml-4"
                  xAxisDataKey="date"
                  lineDataKeys={["portfolio_value", "vni_value"]}
                  grid={true}
                  legend={true}
                  xAxisTickFormatter={(value) => format(new Date(value), "MMM dd")}
                  yAxisTickFormatter={(value) => `${formatNum(Number(value))}`}
                />
              }
            </CarouselItem>
          </CarouselContent>
        </Carousel>
          {isLoading ? <AssetCardSkeleton /> :
            <AssetCard assetSummaryData={assetSummaryData} />
          }
          <div className="flex flex-col gap-6">
            {isLoading ? <HoldingsCompactSkeleton /> :
              <HoldingsCompact
                stockHoldings={holdingsData.stockHoldings}
                cryptoHoldings={holdingsData.cryptoHoldings}
              />
            }
          </div>
        <div className="flex flex-col items-center justify-center h-full">
          <BitcoinPriceFeed />
        </div>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}