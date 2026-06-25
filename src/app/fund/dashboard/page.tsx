import { Spinner } from "@/components/ui/spinner"
import getNews from "@fund/actions/get-news"
import getDashboard from "@fund/actions/get-dashboard"
import { Suspense } from "react"
import { NewsWidget } from "@fund/components/dashboard/news"
import { TradingViewWidget } from "@fund/components/dashboard/trading-view"
import EquityReturn from "@fund/components/dashboard/equity-return"
import { Portfolio } from "@fund/components/dashboard/portfolio"
import { NetProfit } from "@fund/components/dashboard/net-profit"
import { AumLeverage } from "@fund/components/dashboard/aum-leverage"
import getNetProfit from "@fund/actions/get-netprofit"
import getAumLeverage from "@fund/actions/get-aum-leverage"
import getHoldings from "@fund/actions/get-holdings"

export default function Page() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 xl:grid-cols-3">
        <div className="flex flex-col flex-1 gap-4">
          <Suspense fallback={<Spinner />}>
            <EquityReturnData />
          </Suspense>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <Suspense fallback={<Spinner />}>
            <HoldingsData />
          </Suspense>
          <Suspense fallback={<Spinner />}>
            <AumLeverageData />
          </Suspense>
          <Suspense fallback={<Spinner />}>
            <NetProfitData />
          </Suspense>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <Suspense fallback={<Spinner />}>
            <NewsData />
          </Suspense>
          <TradingViewWidget />
        </div>
      </div>
    </div>
  )
}

async function EquityReturnData() {
  const data = await getDashboard()
  return <EquityReturn data={data} />
}

async function NewsData() {
  const [news, bs] = await Promise.all([getNews(), getHoldings()])
  return <NewsWidget holdings={bs} news={news} />
}

async function NetProfitData() {
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

async function AumLeverageData() {
  const data = await getAumLeverage()
  return (
    <AumLeverage
      assets={{
        cash: data.cash,
        stock: data.stock,
        fund: data.fund,
      }}
      liabilities={{
        total_equity: data.total_equity,
        total_liabilities: data.total_liabilities,
        debts: data.debts,
        margin: data.margin,
      }}
    />
  )
}

async function HoldingsData() {
  const data = await getHoldings()
  return <Portfolio stocks={data} />
}
