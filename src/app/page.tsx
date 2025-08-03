"use client"

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
import { BenchmarkCard, BenchmarkCardSkeleton } from "@/components/cards/benchmark"
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
              {isLoading ? <EquityCardSkeleton /> :
                <EquityCard
                  latestEquity={assetSummaryData?.totalEquity}
                  mtdPnL={mtdPnLData}
                  equityChartData={equityData}
                />
              }
            </CarouselItem>
            <CarouselItem className="basis-11/12 pl-1 pr-6">
              {isLoading ? <BenchmarkCardSkeleton /> :
                <BenchmarkCard
                  lifetimeReturn={lifetimeReturnData}
                  ytdReturn={ytdReturnData}
                  benchmarkChartData={last90DBenchmarkData}
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