"use client"

import * as React from "react"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useDashboardData } from "@/hooks/useDashboardData"
import { RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useState } from "react"
import { mutate } from "swr"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { CryptoHoldings } from "@/components/cards/crypto-holdings"
import { StockHoldings } from "@/components/cards/stock-holdings"

export default function Page() {
  const isMobile = useIsMobile()
  const {
    stockData,
    cryptoData
  } = useDashboardData()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    setIsRefreshing(true)
    await fetch('/api/external/refresh-all-asset-prices', { method: 'POST' })

    // Re-fetch the holdings data
    if (user) {
      await mutate((key: string) => typeof key === 'string' && key.startsWith(`/api/gateway/${user.id}/dashboard`))
    }
    setIsRefreshing(false)
  }

  return (
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Holdings"/>
        <Tabs defaultValue="stocks">
          <div className="flex gap-6 items-center px-6">
            <TabsList className="w-full">
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>
            <div className="[&_svg]:stroke-[1] text-muted-foreground">
              {
                isRefreshing
                  ? <RefreshCw className="animate-spin" />
                  : <RefreshCw onClick={handleRefresh} />
              }
            </div>
          </div>
          <TabsContent value="stocks" className="gap-4 flex flex-col px-6">
            <StockHoldings variant="full" data={stockData} />
          </TabsContent>
          <TabsContent value="crypto" className="flex flex-col px-6">
            <CryptoHoldings variant="full" data={cryptoData} />
          </TabsContent>
        </Tabs>
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}