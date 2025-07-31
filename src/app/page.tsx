"use client"

import * as React from "react"
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

import { EquityCard, EquityCardSkeleton } from "@/components/cards/equity"
import { AssetCard, AssetCardSkeleton } from "@/components/cards/assets"
import { PnLCard, PnLCardSkeleton } from "@/components/cards/monthly-pnl"
import { BenchmarkCard, BenchmarkCardSkeleton } from "@/components/cards/benchmark"
import { HoldingsCompact, HoldingsCompactSkeleton } from "@/components/cards/holdings"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { subDays } from "date-fns"


export default function Page() {
  const {
    equityData,
    twr,
    monthlyPnlData,
    benchmarkData,
    assetSummaryData,
    holdingsData,
    isLoading,
    error,
  } = useDashboardData();

  const latestEquity = equityData.length > 0 ? equityData[equityData.length - 1].net_equity_value : null;
  const mtdPnl = monthlyPnlData.length > 0 ? monthlyPnlData[monthlyPnlData.length - 1].pnl : null;
  const avgPnl = monthlyPnlData.length > 0 ? monthlyPnlData.reduce((acc, item) => acc + item.pnl, 0) / monthlyPnlData.length : null;

  const startDate = React.useMemo(() => subDays(new Date(), 90), []);
  const endDate = React.useMemo(() => new Date(), []);

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
              {isLoading ? <EquityCardSkeleton /> :
                <EquityCard
                  latestEquity={latestEquity}
                  twr={twr}
                  equityChartData={equityData}
                  startDate={startDate}
                  endDate={endDate}
                />
              }
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-1">
              {isLoading ? <PnLCardSkeleton /> :
                <PnLCard
                  mtdPnl={mtdPnl}
                  avgPnl={avgPnl}
                  monthlyPnlData={monthlyPnlData}
                />
              }
            </CarouselItem>
            <CarouselItem className="basis-11/12 pl-1 pr-6">
              {isLoading ? <BenchmarkCardSkeleton /> :
                <BenchmarkCard
                  benchmarkChartData={benchmarkData}
                  startDate={startDate}
                  endDate={endDate}
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
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}