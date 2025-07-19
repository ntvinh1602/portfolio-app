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

import { EquityCard } from "@/components/cards/equity"
import { AssetCard } from "@/components/cards/assets"
import { PnLCard } from "@/components/cards/monthly-pnl"
import { BenchmarkCard } from "@/components/cards/benchmark"
import { StockCardCompact } from "@/components/cards/stock-compact"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardCache } from "@/context/DashboardCacheContext"
import { format, subDays } from "date-fns"

export default function Page() {
  const [userName, setUserName] = React.useState("...")
  const { data, isLoading, error } = useDashboardCache()

  const equityData = data?.equityData || []
  const twr = data?.twr || null
  const monthlyPnlData = data?.monthlyPnlData || []
  const benchmarkData = data?.benchmarkData || []
  const assetSummaryData = data?.assetSummaryData || null

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

  if (isLoading) {
    return (
      <PageMain>
        <PageHeader title=""/>
        <PageContent className="px-0">
          <div className="flex items-center justify-center h-full animate-pulse">
            Waking up, be patient...
          </div>
        </PageContent>
        <BottomNavBar />
      </PageMain>
    )
  }

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
              <EquityCard
                latestEquity={latestEquity}
                twr={twr}
                equityChartData={equityData}
                startDate={startDate}
                endDate={endDate}
              />
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-2">
              <PnLCard
                mtdPnl={mtdPnl}
                avgPnl={avgPnl}
                monthlyPnlData={monthlyPnlData}
              />
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-2 pr-6">
              <BenchmarkCard
                benchmarkChartData={benchmarkData}
                startDate={startDate}
                endDate={endDate}
              />
            </CarouselItem>
          </CarouselContent>
        </Carousel>
        <AssetCard assetSummaryData={assetSummaryData} />
        <StockCardCompact />
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}