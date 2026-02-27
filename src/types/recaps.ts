export type StockPnl = {
  ticker: string
  name: string
  logo_url: string
  total_pnl: number
}

export type ProfitChart = {
  revenue: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
}

export type ReturnChart = {
  snapshot_date: string
  vni_value: number
  portfolio_value: number
}

export type Recaps = {
  year: number
  stock_pnl: StockPnl[]
  total_pnl: number
  avg_profit: number
  avg_expense: number
  profit_chart: ProfitChart[]
  deposits: number
  withdrawals: number
  equity_ret: number
  vn_ret: number
  return_chart: ReturnChart[]
}[]