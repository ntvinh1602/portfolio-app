"use server"

import { createClient } from "@/lib/supabase/server"
import { createPublicClient } from "@/lib/supabase/public"
import {
  EquityRollingView,
  BenchmarkRollingView,
  NewsArticle,
  BSheetView,
  ProfitView,
} from "@fund/fund.types"
import { cacheLife, cacheTag } from "next/cache"

// Pnl & Expenses

export async function get1yProfit() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pnl_expense_last1y")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ProfitView
}

// Balance Sheet & Portfolio

export async function getBalanceSheet() {
  const supabase = await createClient()
  const [bsResult, interestResult] = await Promise.all([
    supabase.from("balance_sheet").select(),
    supabase.rpc("get_accrued_interest"),
  ])

  if (bsResult.error) throw new Error(bsResult.error.message)
  if (interestResult.error) throw new Error(interestResult.error.message)

  const bsData = (bsResult.data ?? []) as BSheetView[]
  const accruedInterest = interestResult.data ?? 0

  bsData.push({
    ticker: "INTERESTS",
    name: "Accrued Interest",
    asset_class: "liability",
    logo_url: null,
    currency_code: "VND",
    quantity: accruedInterest,
    total_value: accruedInterest,
    mkt_price: 0,
    net_profit: -accruedInterest,
  })

  const fxVnd = bsData.find((r) => r.ticker === "FX.VND")
  const marginValue =
    fxVnd && fxVnd.total_value < 0 ? -fxVnd.total_value : 0

  bsData.push({
    ticker: "MARGIN",
    name: "Margin",
    asset_class: "liability",
    logo_url: null,
    currency_code: "VND",
    quantity: marginValue,
    total_value: marginValue,
    mkt_price: 0,
    net_profit: 0,
  })

  const unrealized = bsData.reduce((sum, r) => sum + r.net_profit, 0)

  bsData.push({
    ticker: "UNREALIZED",
    name: "Unrealized PnL",
    asset_class: "equity",
    logo_url: null,
    currency_code: "VND",
    quantity: unrealized,
    total_value: unrealized,
    mkt_price: 0,
    net_profit: 0,
  })

  return bsData
}

// News

export async function getNews() {
  "use cache"
  cacheTag("news")
  cacheLife("hours")

  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, url, source, excerpt, published_at, related_stocks")
    .order("published_at", { ascending: false })

  if (error) {
    console.error("NEWS FETCH ERROR:", error)
    throw new Error(error.message)
  }

  return (data?.map((article) => ({
    ...article,
    tickers: article.related_stocks ?? [],
  })) ?? []) as NewsArticle[]
}

// Equity & Benchmark

export async function getEquityRolling() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("equity_rollings")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EquityRollingView
}

export async function getBenchmarkRolling() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("benchmark_rollings")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as BenchmarkRollingView
}
