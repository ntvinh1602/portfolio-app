"use client"

import {
  AssetCard,
  Portfolio,
  EquityChart,
  ReturnChart,
  NetProfit,
  TradingViewWidget,
  NewsWidget,
} from "./components"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMemo, useState } from "react"
import type { Dashboard } from "@/types/dashboard"
import type { NewsArticle } from "@/types/news"

export default function DashboardClient({
  data,
  news
}: {
  data: Dashboard
  news: NewsArticle[]
}) {
  const isMobile = useIsMobile()
  const [equityRange, setEquityRange] = useState("1y")
  const [returnRange, setReturnRange] = useState("1y")

  const equityChart = useMemo(() => {
    switch (equityRange) {
      case "3m": return data.equitychart_3m
      case "6m": return data.equitychart_6m
      case "1y": return data.equitychart_1y
      case "all": return data.equitychart_all
      default: return []
    }
  }, [data, equityRange])

  const returnChart = useMemo(() => {
    switch (returnRange) {
      case "3m": return data.returnchart_3m
      case "6m": return data.returnchart_6m
      case "1y": return data.returnchart_1y
      case "all": return data.returnchart_all
      default: return []
    }
  }, [data, returnRange])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 flex-1 min-h-0">
      <div className="flex flex-col flex-1 gap-2 min-h-0">
        <EquityChart
          dateRange={equityRange}
          onDateRangeChange={setEquityRange}
          chartData={equityChart}
          totalEquity={data.total_equity}
          pnlMtd={data.pnl_mtd}
          pnlYtd={data.pnl_ytd}
        />
        <ReturnChart
          dateRange={returnRange}
          onDateRangeChange={setReturnRange}
          chartData={returnChart}
          twrYtd={data.twr_ytd}
          twrAll={data.twr_all}
          inceptionDate={'2021-11-09'}
        />
      </div>
      
      <div className="flex flex-col flex-1 gap-2 min-h-0">
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

      <div className="flex flex-col flex-1 gap-2 min-h-0">
        <div className="flex flex-col min-h-0 flex-1">
          <NewsWidget stockList={data.stock_list} news={news} />
        </div>
        {!isMobile && (
          <div className="flex flex-col min-h-0 flex-1"> 
            <TradingViewWidget />
          </div>
        )}
      </div>

    </div>
  )
}