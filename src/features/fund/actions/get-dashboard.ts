"use server"

import { createClient } from "@/lib/supabase/server"
import {
  EquityReturnView,
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
  const { data, error } = await supabase.from("balance_sheet").select()

  if (error) throw new Error(error.message)

  return data as BSheetView[]
}

// News

export async function getNews() {
  "use cache: private"
  cacheTag("news")
  cacheLife("days")

  const supabase = await createClient()
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

export async function getEquityReturn() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("equity_return_data")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as EquityReturnView
}
