import { getNews, get1yProfit } from "@fund/actions/get-dashboard"
import getStockHoldings from "@fund/actions/get-stock-holdings"
import { Suspense } from "react"
import { NewsSkeleton } from "@/features/fund/components/ui/news"
import { NewsSection } from "@fund/components/dashboard/news-section"
import { TradingViewWidget } from "@fund/components/dashboard/trading-view"
import { EquityReturnSection } from "@fund/components/dashboard/equity-return"
import { DashboardDateRangeProvider } from "@fund/components/dashboard/context"
import { PortfolioSection } from "@fund/components/dashboard/portfolio-section"
import { NetProfitChart } from "@/features/fund/components/ui/netprofit-chart"
import { FullChartSkeleton } from "@/components/skeletons/chart-card"
import type { ProfitChartCols } from "@fund/fund.types"
import StatusLabel from "@/components/status-label"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardDateRangeProvider>
          <EquityReturnSection />
        </DashboardDateRangeProvider>

        <div className="flex flex-col flex-1 gap-6">
          <PortfolioSection />
          <Suspense
            fallback={
              <FullChartSkeleton
                name="Alpha"
                stat1="equity return"
                stat2="vnindex return"
              >
                <StatusLabel type="loading" />
              </FullChartSkeleton>
            }
          >
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
  const meta = { name: "Net Profit", stat1: "avg. profit", stat2: "avg. cost"}
  return (
    <NetProfitChart
      meta={meta}
      totalPnl={data.total_pnl}
      avgProfit={data.avg_profit}
      avgExpense={data.avg_expense}
      chartRows={chartRows}
    />
  )
}

async function NewsData() {
  const [news, stocks] = await Promise.all([getNews(), getStockHoldings()])
  return <NewsSection stocks={stocks} news={news} />
}
