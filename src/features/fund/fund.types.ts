export interface StockPnLItem {
  logo_url: string
  name: string
  ticker: string
  total_pnl: number
}

export type EquityChartPt = {
  snapshot_date: string
  net_equity: number
  cumulative_cashflow: number
}

export type ReturnChartPt = {
  snapshot_date: string
  vni_value: number
  portfolio_value: number
}

export type ProfitChartPt = {
  revenue: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
}

export interface Asset {
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

export interface Performance {
  avg_expense: number
  avg_profit: number
  deposits: number
  equity_ret: number
  total_pnl: number
  vn_ret: number
  withdrawals: number
  year: number
  profit_chart: ProfitChartPt[]
  return_chart: ReturnChartPt[]
  stock_pnl: StockPnLItem[]
}

export type Dashboard = {
  pnl_ytd: number
  pnl_mtd: number
  twr_ytd: number
  twr_all: number
  cagr: number
  total_equity: number
  total_liabilities: number
  fund: number
  stock: number
  cash: number
  margin: number
  debts: number
  total_pnl: number
  avg_profit: number
  avg_expense: number
  profit_chart: ProfitChartPt[]
  equitychart: {
    last_1y: EquityChartPt[]
    last_3m: EquityChartPt[]
    last_6m: EquityChartPt[]
    all: EquityChartPt[]
  }
  returnchart: {
    last_1y: ReturnChartPt[]
    last_3m: ReturnChartPt[]
    last_6m: ReturnChartPt[]
    all: ReturnChartPt[]
  }
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

export type NetProfitCard = {
  total_pnl: number
  avg_profit: number
  avg_expense: number
  profit_chart: ProfitChartPt[]
}