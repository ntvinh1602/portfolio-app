"use client"

import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem
} from "@/components/ui/carousel"
import { AssetCard } from "@/app/dashboard/components/total-assets"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { Portfolio } from "@/app/dashboard/components/portfolio"
import TradingView from "@/app/dashboard/components/trading-view"
import { EquityChart } from "./components/charts/equity-chart"
import { Benchmarkchart } from "./components/charts/benchmark-chart"
import { ExpenseChart } from "./components/charts/expense-chart"

export default function Page() {
  const isMobile = useIsMobile()
 
  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon"/>
      <SidebarInset className={`flex flex-col ${isMobile ? undefined : "px-4 h-svh"}`}>
        <Header title="Dashboard"/>
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
                <TradingView />
              </div>
              <ExpenseChart/>
            </div>
          }
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
