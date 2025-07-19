"use client"

import * as React from "react"
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

type MonthlyData = {
  month: string
  pnl: number
  twr: number
}

type PnlData = {
  month: string
  pnl: number
}

type TwrData = {
  month: string
  twr: number
}

export default function Page() {
  const [dateRange, setDateRange] = React.useState("12m")
  const [data, setData] = React.useState<MonthlyData[]>([])
  const [avgPnl, setAvgPnl] = React.useState(0)
  const [avgTwr, setAvgTwr] = React.useState(0)

  React.useEffect(() => {
    const fetchData = async () => {
      const now = new Date()
      let startDate
      const endDate = format(endOfMonth(now), "yyyy-MM-dd")

      if (dateRange === "12m") {
        startDate = format(startOfMonth(sub(now, { months: 11 })), "yyyy-MM-dd")
      } else {
        try {
          const response = await fetch("/api/query/first-snapshot-date")
          if (response.ok) {
            const data = await response.json()
            startDate = data.date
          } else {
            console.error("Failed to fetch first snapshot date")
            startDate = format(
              startOfMonth(sub(now, { years: 1 })),
              "yyyy-MM-dd"
            )
          }
        } catch (error) {
          console.error("Error fetching first snapshot date:", error)
          startDate = format(
            startOfMonth(sub(now, { years: 1 })),
            "yyyy-MM-dd"
          )
        }
      }

      try {
        const [pnlResponse, twrResponse] = await Promise.all([
          fetch(
            `/api/query/monthly-pnl?start_date=${startDate}&end_date=${endDate}`
          ),
          fetch(
            `/api/query/monthly-twr?start_date=${startDate}&end_date=${endDate}`
          ),
        ])

        const pnlData = await pnlResponse.json()
        const twrData = await twrResponse.json()

        if (pnlResponse.ok && twrResponse.ok) {
          const combinedData = pnlData.map((pnlItem: PnlData) => {
            const twrItem = twrData.find(
              (t: TwrData) => t.month === pnlItem.month
            )
            return {
              ...pnlItem,
              twr: twrItem ? twrItem.twr : 0,
            }
          })
          setData(combinedData)

          if (combinedData.length > 0) {
            const totalPnl = combinedData.reduce(
              (acc: number, item: MonthlyData) => acc + item.pnl,
              0
            )
            const totalTwr = combinedData.reduce(
              (acc: number, item: MonthlyData) => acc + item.twr,
              0
            )
            setAvgPnl(totalPnl / combinedData.length)
            setAvgTwr(totalTwr / combinedData.length)
          }
        } else {
          console.error("Failed to fetch data")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [dateRange])

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
          value2={`${formatNum(100*avgTwr, 2)}%`}
        />
        <PnLTable data={data} />
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}