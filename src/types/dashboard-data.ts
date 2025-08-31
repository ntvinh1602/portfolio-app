export interface SummaryItem {
  type: string
  totalAmount: number
}

export interface AssetSummaryData {
  assets: SummaryItem[]
  totalAssets: number
  liabilities: SummaryItem[]
  totalLiabilities: number
  equity: SummaryItem[]
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