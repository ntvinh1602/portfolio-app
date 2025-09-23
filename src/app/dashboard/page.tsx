"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import {
  AssetCard,
  Portfolio,
  EquityChart,
  Benchmarkchart,
  ExpenseChart,
  TradingViewWidget
} from "./components"
import { useIsMobile } from "@/hooks/use-mobile"

export default function Page() {
  const isMobile = useIsMobile()
 
  return (
    <div className="grid grid-cols-3 px-0 gap-2 flex-1 overflow-hidden">
      {isMobile ?
        <Carousel opts={{ align: "center" }} className="w-full col-span-3">
          <CarouselContent className="-ml-2">
            <CarouselItem className="basis-11/12 pl-4">
              <EquityChart/>
            </CarouselItem>
            <CarouselItem className="basis-10/12 pl-1 pr-2">
              <Benchmarkchart/>
            </CarouselItem>
            <CarouselItem className="basis-11/12 pl-1 pr-2">
              <ExpenseChart/>
            </CarouselItem>
          </CarouselContent>
        </Carousel> :
        <div className="flex flex-col col-span-1 gap-2 h-full">
          <EquityChart/>
          <Benchmarkchart/>
        </div>
      }
      <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0">
        <AssetCard/>
        <Portfolio/>
      </div>
      {!isMobile && 
        <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0">
          <div className="h-[400px]">
            <TradingViewWidget/>
          </div>
          <ExpenseChart/>
        </div>
      }
    </div>
  )
}
