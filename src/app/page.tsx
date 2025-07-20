"use client"

import { supabase } from "@/lib/supabase/supabaseClient"
import * as React from "react"
import { getGreeting } from "@/lib/utils"
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
import { StockCardCompact, StockCardCompactSkeleton } from "@/components/cards/stock-compact"
import { CryptoCardCompact, CryptoCardCompactSkeleton } from "@/components/cards/crypto-compact"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { subDays } from "date-fns"


export default function Page() {
  const [userName, setUserName] = React.useState("...")
  const {
    equityData,
    twr,
    monthlyPnlData,
    benchmarkData,
    assetSummaryData,
    isLoading,
    error,
  } = useDashboardData()

  const latestEquity = equityData.length > 0 ? equityData[equityData.length - 1].net_equity_value : null;
  const mtdPnl = monthlyPnlData.length > 0 ? monthlyPnlData[monthlyPnlData.length - 1].pnl : null;
  const avgPnl = monthlyPnlData.length > 0 ? monthlyPnlData.reduce((acc, item) => acc + item.pnl, 0) / monthlyPnlData.length : null;

  const startDate = React.useMemo(() => subDays(new Date(), 90), []);
  const endDate = React.useMemo(() => new Date(), []);

  React.useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()
        setUserName(profile?.display_name || "Anonymous")
      }
    }

    fetchUser()
  }, [])

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
      <PageHeader title={`${getGreeting()}, ${userName}!`} />
      <PageContent className="px-0">
        <Carousel opts={{ align: "center" }} className="w-full">
          <CarouselContent className="-ml-2 h-[300px]">
            <CarouselItem className="basis-10/12 pl-8">
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
            <CarouselItem className="basis-10/12 pl-2">
              {isLoading ? <PnLCardSkeleton /> :
                <PnLCard
                  mtdPnl={mtdPnl}
                  avgPnl={avgPnl}
                  monthlyPnlData={monthlyPnlData}
                />
              }
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-2 pr-6">
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
          <div className="flex flex-col gap-2">
            {isLoading ? <StockCardCompactSkeleton /> :
              <StockCardCompact />
            }
            {isLoading ? <CryptoCardCompactSkeleton /> :
              <CryptoCardCompact />
            }
          </div>
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}