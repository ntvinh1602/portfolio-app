"use client"

import * as React from "react"
import TabSwitcher from "@/components/tab-switcher"
import { PnLTable } from "@/components/monthly-pnl-table"
import { formatNum } from "@/lib/utils"
import { TwoMetric } from "@/components/cards/two-metric"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { useEarningsData } from "@/hooks/useEarningsData"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"

export default function Page() {
  const isMobile = useIsMobile()
  const [dateRange, setDateRange] = React.useState("12M")
  const { data, error } = useEarningsData(dateRange)

  const { avgPnl, avgTwr } = React.useMemo(() => {
    if (!data || data.length === 0) {
      return { avgPnl: 0, avgTwr: 0 }
    }
    const totalPnl = data.reduce((acc, item) => acc + item.pnl, 0)
    const totalTwr = data.reduce((acc, item) => acc + item.twr, 0)
    return {
      avgPnl: totalPnl / data.length,
      avgTwr: totalTwr / data.length,
    }
  }, [data])

  const tabOptions = [
    { value: "12M", label: "Last 12 months" },
    { value: "all", label: "All Time" },
  ]

  return (
    <SidebarProvider>
      {!isMobile && <AppSidebar />}
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Earnings"/>
        <TabSwitcher
          options={tabOptions}
          onValueChange={setDateRange}
          value={dateRange}
          defaultValue="12M"
        />
        <TwoMetric
          title="Monthly Average"
          subtitle="Your salary if this fund is a full-time job"
          label1="Net P/L"
          value1={formatNum(avgPnl)}
          label2="Return"
          value2={`${formatNum(100 * avgTwr, 2)}%`}
          className="border-0 py-3"
        />
        {error && <p>Error loading data</p>}
        <PnLTable data={data ?? []} />
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}