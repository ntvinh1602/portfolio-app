export type EquityChart = {
  snapshot_date: string
  net_equity: number
  cumulative_cashflow: number
}

export type ReturnChart = {
  snapshot_date: string
  vni_value: number
  portfolio_value: number
}

export type ProfitChart = {
  revenue: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
}

export type Stocks = {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  price: number
}

export type Dashboard = {
  pnl_ytd: number
  pnl_mtd: number
  twr_ytd: number
  twr_all: number
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
  profit_chart: ProfitChart[]
  stock_list: Stocks[]
  equitychart_1y: EquityChart[]
  equitychart_3m: EquityChart[]
  equitychart_6m: EquityChart[]
  equitychart_all: EquityChart[]
  returnchart_1y: ReturnChart[]
  returnchart_3m: ReturnChart[]
  returnchart_6m: ReturnChart[]
  returnchart_all: ReturnChart[]
}