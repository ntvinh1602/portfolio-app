import { Tables } from "@/types/database.types"

export type CashflowView = {
  [K in keyof Tables<"cashflow_all">]: NonNullable<Tables<"cashflow_all">[K]>
}

export type StockPnl = {
  [K in keyof Tables<"stock_pnl_all">]: NonNullable<Tables<"stock_pnl_all">[K]>
}

export type ProfitView = {
  [K in keyof Tables<"pnl_expense_all">]: NonNullable<
    Tables<"pnl_expense_all">[K]
  >
}

export type BenchmarkView = {
  [K in keyof Tables<"benchmark_all">]: NonNullable<Tables<"benchmark_all">[K]>
}

// Columnar equity series: keys stored once, not per-point.
export type ProfitChartCols = {
  snapshot_date: string[]
  revenue: number[]
  fee: number[]
  interest: number[]
  tax: number[]
}

export type EquityChartCols = {
  d: number[] // d = epoch-days (int)
  e: number[] // e = net_equity (rounded)
  c: number[] // c = cumulative_cashflow (rounded)
}

export type BenchmarkChartCols = {
  d: number[] // epoch-days
  p: number[] // portfolio_value (normalized, 2dp)
  v: number[] // vni_value (normalized, 2dp)
}

export type EquityChartWindows = {
  last_1y: EquityChartCols
  last_3m: EquityChartCols
  last_6m: EquityChartCols
  all: EquityChartCols
}

export type BenchmarkChartWindows = {
  last_1y: BenchmarkChartCols
  last_3m: BenchmarkChartCols
  last_6m: BenchmarkChartCols
  all: BenchmarkChartCols
}

export interface BSheetView {
  ticker: string
  name: string
  asset_class: string
  logo_url: string | null
  currency_code: string
  quantity: number
  total_value: number
  mkt_price: number | null
  net_profit: number | null
}

export interface PerformanceView {
  year: number
  avg_expense: number
  avg_profit: number
  deposits: number
  equity_ret: number
  total_pnl: number
  vn_ret: number
  withdrawals: number
  profit_chart: ProfitChartCols
  return_chart: BenchmarkChartCols
  stock_pnl: StockPnl[]
}

export type EquityReturnView = {
  pnl_ytd: number
  pnl_mtd: number
  twr_ytd: number
  twr_all: number
  total_equity: number
  cagr: number
  equitychart: EquityChartWindows
  returnchart: BenchmarkChartWindows
}

export type NewsArticle = {
  id: string
  title: string
  url: string
  source: string
  excerpt: string
  published_at: string
  tickers?: string[]
}
