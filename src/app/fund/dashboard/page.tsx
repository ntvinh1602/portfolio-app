import getNews from "@fund/actions/get-news"
import getDashboard from "@fund/actions/get-dashboard"
import { Suspense } from "react"
import { NewsSkeleton, NewsWidget } from "@fund/components/dashboard/news"
import { TradingViewWidget } from "@fund/components/dashboard/trading-view"
import { EquityReturn } from "@fund/components/dashboard/equity-return"
import {
  Portfolio,
  PortfolioSkeleton,
} from "@fund/components/dashboard/portfolio"
import { NetProfitChart } from "@/features/fund/components/chart/netprofit-chart"
import getNetProfit from "@fund/actions/get-netprofit"
import getStockHoldings from "@/features/fund/actions/get-stock-holdings"
import getBalanceSheet from "@fund/actions/get-balancesheet"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3">
        <div className="flex flex-col flex-1 gap-4">
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
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <Suspense fallback={<PortfolioSkeleton />}>
            <PortfolioData />
          </Suspense>
          <Suspense fallback={<ChartCardSkeleton />}>
            <NetProfitData />
          </Suspense>
        </div>

        <div className="flex flex-col flex-1 gap-4">
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
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const data = await getDashboard()
  return <EquityReturn data={data} />
}

async function PortfolioData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const data = await getBalanceSheet()
  return <Portfolio data={data} />
}

async function NetProfitData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const data = await getNetProfit()
  return (
    <NetProfitChart
      totalPnL={data.total_pnl}
      avgProfit={data.avg_profit}
      avgExpense={data.avg_expense}
      chartData={data.profit_chart}
    />
  )
}

async function NewsData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const [news, bs] = await Promise.all([getNews(), getStockHoldings()])
  return <NewsWidget holdings={bs} news={news} />
}
