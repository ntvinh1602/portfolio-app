"use client"

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
      <div className="flex flex-col col-span-1 gap-2 h-full">
        <EquityChart/>
        <Benchmarkchart/>
      </div>
      <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0">
        <AssetCard/>
        <Portfolio/>
      </div>
      {!isMobile && 
        <div className="flex flex-col col-span-1 gap-2 h-full">
        <div className="flex-1"><TradingViewWidget/></div>
        <div className="flex-1"><ExpenseChart/></div>
        </div>
      }
    </div>
  )
}
