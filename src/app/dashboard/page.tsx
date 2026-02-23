"use client"

import {
  AssetCard,
  Portfolio,
  EquityChart,
  Benchmarkchart,
  NetProfit,
  TradingViewWidget,
  NewsWidget,
} from "./cards"
import { useIsMobile } from "@/hooks/use-mobile"

export default function Page() {
  const isMobile = useIsMobile()
 
  return (
    <div className="grid grid-cols-3 h-full px-0 gap-2 md:gap-6">
      <div className="flex flex-col col-span-3 md:col-span-1 gap-2 px-2 md:px-0 h-full">
        <EquityChart/>
        <Benchmarkchart/>
      </div>

      <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0 h-full">
        <Portfolio />
        <AssetCard />
        <NetProfit/>
      </div>

      <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0 h-full">
        <NewsWidget/>
        {!isMobile && <TradingViewWidget/>}
      </div>
    </div>
  )
}
