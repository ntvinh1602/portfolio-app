export interface StockPnLItem {
  logo_url: string
  name: string
  ticker: string
  total_pnl: number
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

export type ReturnChartCols = {
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

export type ReturnChartWindows = {
  last_1y: ReturnChartCols
  last_3m: ReturnChartCols
  last_6m: ReturnChartCols
  all: ReturnChartCols
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
  return_chart: ReturnChartCols
  stock_pnl: StockPnLItem[]
}

export type Last1YProfitView = {
  total_pnl: number
  avg_profit: number
  avg_expense: number
  profit_chart: ProfitChartCols
}

export type EquityReturnView = {
  pnl_ytd: number
  pnl_mtd: number
  twr_ytd: number
  twr_all: number
  total_equity: number
  cagr: number
  equitychart: EquityChartWindows
  returnchart: ReturnChartWindows
}

export type NewsArticle = {
  id: string
  title: string
  url: string
  source: string
  excerpt: string
  published_at: string
  created_at: string
  tickers?: string[]
}