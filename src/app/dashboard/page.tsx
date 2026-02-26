"use client"

import { useDashboard } from "@/hooks"
import {
  AssetCard,
  Portfolio,
  EquityChart,
  ReturnChart,
  NetProfit,
  TradingViewWidget,
  NewsWidget,
} from "./cards"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMemo, useState } from "react"

export default function Page() {
  const isMobile = useIsMobile()
  const [equityRange, setEquityRange] = useState("1y")
  const [returnRange, setReturnRange] = useState("1y")
  const { data } = useDashboard()

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
    <div className="grid grid-cols-3 h-full px-0 gap-2 md:gap-6">
      <div className="flex flex-col col-span-3 md:col-span-1 gap-2 px-2 md:px-0 h-full">
        <EquityChart
          dateRange={returnRange}
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

      <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0 h-full">
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

      <div className="flex flex-col gap-2 col-span-3 md:col-span-1 px-2 md:px-0 h-full">
        <NewsWidget/>
        {!isMobile && <TradingViewWidget/>}
      </div>
    </div>
  )
}
