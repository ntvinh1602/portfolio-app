"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import { EquityCard } from "@/components/dashboard/equity-card"
import { AssetCard } from "@/components/dashboard/asset-card"
import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"

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
              <EquityCard />
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-2 pr-6">
              <EquityCard />
            </CarouselItem>
          </CarouselContent>
        </Carousel>
        <AssetCard />
      </PageContent>
    </PageMain>
  )
}