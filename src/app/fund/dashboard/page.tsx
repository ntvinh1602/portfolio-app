import getNews from "@fund/actions/get-news"
import getDashboard from "@fund/actions/get-dashboard"
import { Suspense } from "react"
import { NewsWidget } from "@fund/components/dashboard/news"
import { TradingViewWidget } from "@fund/components/dashboard/trading-view"
import EquityReturn from "@fund/components/dashboard/equity-return"
import { Portfolio } from "@fund/components/dashboard/portfolio"
import { NetProfit } from "@fund/components/dashboard/net-profit"
import getNetProfit from "@fund/actions/get-netprofit"
import getHoldings from "@fund/actions/get-holdings"
import ChartCardSkeleton from "@/components/skeletons/chart-card"
import YearSwitcherSkeleton from "@/components/skeletons/year-switcher"
import DetailedListSkeleton from "@/components/skeletons/detailed-list"
import SimpleListSkeleton from "@/components/skeletons/simple-list"
import getBalanceSheet from "@fund/actions/get-balancesheet"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3">
        <div className="flex flex-col flex-1 gap-4">
          <Suspense
            fallback={
              <div className="flex flex-col gap-4">
                <YearSwitcherSkeleton />
                <ChartCardSkeleton
                  title="Equity"
                  description1="this month"
                  description2="this year"
                />
                <ChartCardSkeleton
                  title="Return"
                  description1="all time"
                  description2="annualized"
                />
              </div>
            }
          >
            <EquityReturnData />
          </Suspense>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <Suspense fallback={<SimpleListSkeleton title="Portfolio" />}>
            <PortfolioData />
          </Suspense>
          <Suspense
            fallback={
              <ChartCardSkeleton
                title="Net Profit"
                description1="avg. profit"
                description2="avg. cost"
              />
            }
          >
            <NetProfitData />
          </Suspense>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <Suspense fallback={<DetailedListSkeleton title="Market Pulse" />}>
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

async function NewsData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const [news, bs] = await Promise.all([getNews(), getHoldings()])
  return <NewsWidget holdings={bs} news={news} />
}

async function NetProfitData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const data = await getNetProfit()
  return (
    <NetProfit
      totalPnL={data.total_pnl}
      avgProfit={data.avg_profit}
      avgExpense={data.avg_expense}
      chartData={data.profit_chart}
    />
  )
}

async function PortfolioData() {
  if (process.env.NEXT_PUBLIC_DEBUG_SKELETON === "1") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
  const data = await getBalanceSheet()
  return (
    <Portfolio
      bs={data.bsData}
      liability={data.liability}
      equity={data.equity}
      cash={data.cash}
      stock={data.stock}
      fund={data.fund}
      debt={data.debt}
      margin={data.margin}
    />
  )
}
