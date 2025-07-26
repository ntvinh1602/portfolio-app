"use client"

import * as React from "react"
import useSWR from "swr"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import TabSwitcher from "@/components/tab-switcher"
import { PnLTable } from "@/components/monthly-pnl-table"
import {
  endOfMonth,
  format,
  startOfMonth,
  sub,
} from "date-fns"
import { formatNum } from "@/lib/utils"
import { TwoMetric } from "@/components/cards/two-metric"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/hooks/useAuth"

type MonthlyData = {
  month: string
  pnl: number
  twr: number
}

export default function Page() {
  const { userId } = useAuth()
  const [dateRange, setDateRange] = React.useState("12m")
  const { data: firstSnapshotDateData } = useSWR(
    userId ? `/api/query/${userId}/first-snapshot-date` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  const { data, error } = useSWR<MonthlyData[]>(
    () => {
      if (!userId) return null

      const now = new Date()
      let startDate
      const endDate = format(endOfMonth(now), "yyyy-MM-dd")

      if (dateRange === "12m") {
        startDate = format(startOfMonth(sub(now, { months: 11 })), "yyyy-MM-dd")
      } else if (firstSnapshotDateData) {
        startDate = firstSnapshotDateData.date
      } else {
        return null
      }

      return `/api/gateway/${userId}/earnings?start_date=${startDate}&end_date=${endDate}`
    },
    fetcher
  )

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
    { value: "12m", label: "Last 12 months" },
    { value: "all", label: "All Time" },
  ]

  return (
    <PageMain>
      <PageHeader title="Earnings" />
      <PageContent>
        <TabSwitcher
          options={tabOptions}
          onValueChange={setDateRange}
          value={dateRange}
          defaultValue="12m"
        />
        <TwoMetric
          title="Monthly Average"
          subtitle="Your salary if this fund is a full-time job"
          label1="Net P/L"
          value1={formatNum(avgPnl)}
          label2="Return"
          value2={`${formatNum(100 * avgTwr, 2)}%`}
        />
        {error && <p>Error loading data</p>}
        <PnLTable data={data ?? []} />
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}