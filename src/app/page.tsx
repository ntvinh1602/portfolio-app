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

export default function Page() {
  const [userName, setUserName] = React.useState("...")

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

  return (
    <PageMain>
      <PageHeader title={`${getGreeting()}, ${userName}!`} />
      <PageContent className="px-0">
        <Carousel opts={{ align: "center" }} className="w-full">
          <CarouselContent className="-ml-2 h-[300px]">
            <CarouselItem className="basis-10/12 pl-8">
              <EquityCard />
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-2">
              <PnLCard />
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-2 pr-6">
              <BenchmarkCard />
            </CarouselItem>
          </CarouselContent>
        </Carousel>
        <AssetCard />
        <StockCardCompact />
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}