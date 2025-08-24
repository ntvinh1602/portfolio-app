export interface StockHolding {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  latest_price: number
}

export interface CryptoHolding extends StockHolding {
  latest_usd_rate: number
}