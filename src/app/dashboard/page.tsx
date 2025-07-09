"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"

import { EquityCard } from "@/components/dashboard/equity-card"
import { AssetCard } from "@/components/dashboard/asset-card"
import { PnLCard } from "@/components/dashboard/pnl-card"
import { BenchmarkCard } from "@/components/dashboard/benchmark-card"
import { StockCardCompact } from "@/components/stock/stock-card-compact"

export default function Page() {
  return (
    <PageMain>
      <PageHeader title="Dashboard" />
      <PageContent className="px-0">
        <Carousel opts={{ align: "center" }} className="w-full">
          <CarouselContent className="-ml-2">
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
    </PageMain>
  )
}