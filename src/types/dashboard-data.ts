export interface AssetItem {
  type: string
  totalAmount: number
}

export interface BalanceSheetData {
  assets: AssetItem[]
  totalAssets: number
  liabilities: AssetItem[]
  totalLiabilities: number
  equity: AssetItem[]
  totalEquity: number
}

export interface StockData {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  latest_price: number
  total_amount: number
}

export interface CryptoData extends StockData {
  latest_usd_rate: number
}

export type EquityChartData = {
  snapshot_date: string
  net_equity_value: number
}

export type BenchmarkChartData = {
  snapshot_date: string
  portfolio_value: number
  vni_value: number
}

export type PnLData = {
  all_time: number
  ytd: number
  mtd: number
}

export type TWRData = {
  all_time: number
  ytd: number
}

export type MonthlyData = {
  date: string
  fee: number
  interest: number
  pnl: number
  tax: number
}