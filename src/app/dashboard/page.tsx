"use client"

import {
  AssetCard,
  Portfolio,
  EquityChart,
  Benchmarkchart,
  NetProfit,
  TradingViewWidget,
} from "./components"
import { useIsMobile } from "@/hooks/use-mobile"
import { Header } from "@/components/header"

export default function Page() {
  const isMobile = useIsMobile()
 
  return (
    <div className="flex flex-col md:h-svh pb-4">
      <Header title="Dashboard"/>
      <div className="grid grid-cols-3 px-0 gap-2 md:gap-6 flex-1">
        <div className="flex flex-col col-span-3 md:col-span-1 gap-2 px-2 md:px-0 h-full">
          <EquityChart/>
          <Benchmarkchart/>
        </div>

        <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0 h-full">
          <AssetCard />
          <div className="flex-1">
            <Portfolio />
          </div>
        </div>

        <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0 h-full">
          {!isMobile &&
            <div className="flex-1">
              <TradingViewWidget/>
            </div>
          }
          <div className="flex-1">
            <NetProfit/>
          </div>
        </div>
      </div>
    </div>

  )
}
