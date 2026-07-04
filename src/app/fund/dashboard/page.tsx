import { getNews } from "@fund/actions/get-dashboard"
import { get1yProfit } from "@/features/fund/actions/get-dashboard"
import getStockHoldings from "@fund/actions/get-stock-holdings"
import { getBalanceSheet } from "@fund/actions/get-dashboard"
import { Suspense } from "react"
import { NewsSkeleton, NewsWidget } from "@fund/components/dashboard/news"
import { TradingViewWidget } from "@fund/components/dashboard/trading-view"
import { EquityReturn } from "@fund/components/dashboard/equity-return"
import {
  Portfolio,
  PortfolioSkeleton,
} from "@fund/components/dashboard/portfolio"
import { NetProfitChart } from "@fund/components/chart/netprofit-chart"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import { Skeleton } from "@/components/ui/skeleton"
import { getEquityReturn } from "@fund/actions/get-dashboard"
import { ProfitChartCols, ProfitView } from "@/features/fund/fund.types"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              <Skeleton className="h-11 w-full rounded-4xl" />
              <ChartCardSkeleton />
              <ChartCardSkeleton />
            </div>
          }
        >
          <EquityReturnData />
        </Suspense>

        <div className="flex flex-col flex-1 gap-6">
          <Suspense fallback={<PortfolioSkeleton />}>
            <PortfolioData />
          </Suspense>
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

async function EquityReturnData() {
  const data = await getEquityReturn()
  return <EquityReturn data={data} />
}

async function PortfolioData() {
  const data = await getBalanceSheet()
  return <Portfolio data={data} />
}

async function NetProfitData() {
  const data = await get1yProfit()
  return (
    <NetProfitChart
      totalPnl={data.total_pnl}
      avgProfit={data.avg_profit}
      avgExpense={data.avg_expense}
      chartRows={data.profit_chart as ProfitView[]}
    />
  )
}

async function NewsData() {
  const [news, stocks] = await Promise.all([getNews(), getStockHoldings()])
  return <NewsWidget stocks={stocks} news={news} />
}
