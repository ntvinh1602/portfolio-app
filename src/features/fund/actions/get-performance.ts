"use server"

import { createClient } from "@/lib/supabase/server"
import {
  BenchmarkView,
  CashflowView,
  ProfitView,
  StockPnl,
} from "@fund/fund.types"

// Cashflow

export async function getCashflow(year: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cashflow_yearly")
    .select("deposits, withdrawals")
    .eq("year", year)
    .single()

  if (error) throw new Error(error.message)
  return data as CashflowView
}

export async function getCashflowAllTime() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cashflow_all")
    .select("deposits, withdrawals")
    .single()

  if (error) throw new Error(error.message)
  return data as CashflowView
}

// Stocks

export async function getStocks(year: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stock_pnl_yearly")
    .select("ticker, name, logo_url, total_pnl")
    .eq("year", year)

  if (error) throw new Error(error.message)
  return data as StockPnl[]
}

export async function getStocksAll() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("stock_pnl_all")
    .select("ticker, name, logo_url, total_pnl")

  if (error) throw new Error(error.message)
  return data as StockPnl[]
}

// Pnl & Expenses

export async function getProfit(year: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pnl_expense_yearly")
    .select("profit_chart, total_pnl, avg_profit, avg_expense")
    .eq("year", year)
    .single()

  if (error) throw new Error(error.message)
  return data as ProfitView
}

export async function getProfitAllTime() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pnl_expense_all")
    .select("profit_chart, total_pnl, avg_profit, avg_expense")
    .single()

  if (error) throw new Error(error.message)
  return data as ProfitView
}

// Benchmark

export async function getReturn(year: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("benchmark_yearly")
    .select("return_chart, equity_ret, vn_ret")
    .eq("year", year)
    .single()

  if (error) throw new Error(error.message)
  return data as BenchmarkView
}

export async function getReturnAllTime() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("benchmark_all")
    .select("return_chart, equity_ret, vn_ret")
    .single()

  if (error) throw new Error(error.message)
  return data as BenchmarkView
}
