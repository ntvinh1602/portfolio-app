export interface AssetItem {
  type: string
  totalAmount: number
}

export interface StockData {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  price: number
  market_value: number
}

export interface CryptoData extends StockData {
  fx_rate: number
  currency_code: string
}

export type EquityChartData = {
  snapshot_date: string
  net_equity_value: number
  total_cashflow: number
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