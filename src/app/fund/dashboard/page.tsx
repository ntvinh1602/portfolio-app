import { getNews, get1yProfit } from "@fund/actions/get-dashboard"
import getStockHoldings from "@fund/actions/get-stock-holdings"
import { Suspense } from "react"
import { NewsSkeleton, NewsWidget } from "@fund/components/dashboard/news"
import { TradingViewWidget } from "@fund/components/dashboard/trading-view"
import { EquityReturnSection } from "@fund/components/dashboard/equity-return"
import { DashboardDateRangeProvider } from "@fund/components/dashboard/context"
import { PortfolioSection } from "@fund/components/dashboard/portfolio-section"
import { NetProfitChart } from "@fund/components/chart/netprofit-chart"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import type { ProfitChartCols } from "@fund/fund.types"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardDateRangeProvider>
          <EquityReturnSection />
        </DashboardDateRangeProvider>

        <div className="flex flex-col flex-1 gap-6">
          <PortfolioSection />
          <Suspense fallback={<ChartCardSkeleton />}>
            <NetProfitData />
          </Suspense>
        </div>

        <div className="flex flex-col flex-1 gap-6">
          <Suspense fallback={<NewsSkeleton />}>
            <NewsData />
          </Suspense>
          <TradingViewWidget />
        </div>
      </div>
    </div>
  )
}

async function NetProfitData() {
  const data = await get1yProfit()
  const profit = data.profit_chart as ProfitChartCols
  const chartRows = profit.snapshot_date.map((snapshot_date, i) => ({
    snapshot_date,
    revenue: profit.revenue[i],
    fee: profit.fee[i],
    interest: profit.interest[i],
    tax: profit.tax[i],
  }))
  return (
    <NetProfitChart
      totalPnl={data.total_pnl}
      avgProfit={data.avg_profit}
      avgExpense={data.avg_expense}
      chartRows={chartRows}
    />
  )
}

async function NewsData() {
  const [news, stocks] = await Promise.all([getNews(), getStockHoldings()])
  return <NewsWidget stocks={stocks} news={news} />
}
