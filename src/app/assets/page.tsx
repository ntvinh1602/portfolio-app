"use client"

import * as React from "react"
import { useDashboardData } from "@/hooks/useDashboardData"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { BalanceSheet } from "@/components/cards/balance-sheet"

export default function Page() {
  const isMobile = useIsMobile()
  const { assetSummaryData } = useDashboardData()

return (
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset>
        <Header title="Assets"/>
        <BalanceSheet data={assetSummaryData}/>
        {isMobile && <BottomNavBar />}
      </SidebarInset>
    </SidebarProvider>
  )
}