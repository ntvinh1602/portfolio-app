"use client"

import { AssetCard } from "./aum-leverage"
import { Portfolio } from "./portfolio"
import { EquityChart } from "./equity"
import { ReturnChart } from "./return"
import { NetProfit } from "./net-profit"
import { TradingViewWidget } from "./trading-view"
import { NewsWidget } from "./news"
import { useMemo, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Dashboard } from "@/types/dashboard"
import type { NewsArticle } from "@/types/news"

export default function Dashboard({
  data,
  news
}: {
  data: Dashboard
  news: NewsArticle[]
}) {
  const [dateRange, setDateRange] = useState("1y")

  const equityChart = useMemo(() => {
    switch (dateRange) {
      case "3m": return data.equitychart_3m
      case "6m": return data.equitychart_6m
      case "1y": return data.equitychart_1y
      case "all": return data.equitychart_all
      default: return []
    }
  }, [data, dateRange])

  const returnChart = useMemo(() => {
    switch (dateRange) {
      case "3m": return data.returnchart_3m
      case "6m": return data.returnchart_6m
      case "1y": return data.returnchart_1y
      case "all": return data.returnchart_all
      default: return []
    }
  }, [data, dateRange])

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3">
        <div className="flex flex-col flex-1 gap-4">
          <ToggleGroup
            type="single"
            value={dateRange}
            onValueChange={setDateRange}
            spacing={1}
            className="w-full"
          >
            <ToggleGroupItem value="3m" className="flex-1">3 months</ToggleGroupItem>
            <ToggleGroupItem value="6m" className="flex-1">6 months</ToggleGroupItem>
            <ToggleGroupItem value="1y" className="flex-1">1 year</ToggleGroupItem>
            <ToggleGroupItem value="all" className="flex-1">All time</ToggleGroupItem>
          </ToggleGroup>
          <EquityChart
            dateRange={dateRange}
            chartData={equityChart}
            totalEquity={data.total_equity}
            pnlMtd={data.pnl_mtd}
            pnlYtd={data.pnl_ytd}
          />
          <ReturnChart
            dateRange={dateRange}
            chartData={returnChart}
            twrYtd={data.twr_ytd}
            twrAll={data.twr_all}
            inceptionDate={'2021-11-09'}
          />
        </div>
        
        <div className="flex flex-col flex-1 gap-4">
          <Portfolio stocks={data.stock_list} />
          <AssetCard
            assets={{
              cash: data.cash,
              stock: data.stock,
              fund: data.fund
            }}
            liabilities={{
              total_equity: data.total_equity,
              total_liabilities: data.total_liabilities,
              debts: data.debts,
              margin: data.margin
            }}
          />
          <NetProfit
            totalPnL={data.total_pnl}
            avgProfit={data.avg_profit}
            avgExpense={data.avg_expense}
            chartData={data.profit_chart}
          />
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <NewsWidget stockList={data.stock_list} news={news} />
          <TradingViewWidget />
        </div>
      </div>
    </div>
  )
}