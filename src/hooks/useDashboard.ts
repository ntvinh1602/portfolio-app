"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

type EquityChart = {
  snapshot_date: string
  net_equity: number
  cumulative_cashflow: number
}

type ReturnChart = {
  snapshot_date: string
  vni_value: number
  portfolio_value: number
}

type ProfitChart = {
  revenue: number
  fee: number
  interest: number
  tax: number 
  snapshot_date: string
}

type Stocks = {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  cost_basis: number
  price: number
}

type Dashboard = {
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

const EMPTY_DASHBOARD: Dashboard = {
  pnl_ytd: 0,
  pnl_mtd: 0,
  twr_ytd: 0,
  twr_all: 0,
  total_equity: 0,
  total_liabilities: 0,
  fund: 0,
  stock: 0,
  cash: 0,
  margin: 0,
  debts: 0,
  total_pnl: 0,
  avg_profit: 0,
  avg_expense: 0,
  profit_chart: [],
  stock_list: [],
  equitychart_1y: [],
  equitychart_3m: [],
  equitychart_6m: [],
  equitychart_all: [],
  returnchart_1y: [],
  returnchart_3m: [],
  returnchart_6m: [],
  returnchart_all: []
}

export function useDashboard() {
  const fetchDashboard = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("dashboard_data")
      .select()
      .single()
      
    if (error) throw new Error(error.message)
    return data as Dashboard
  }

  const { data, error, isLoading, mutate } = useSWR(
    ["dashboard", "priceRefresh"],
    fetchDashboard,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10,
    }
  )

  return {
    data: data ?? EMPTY_DASHBOARD,
    isLoading,
    error,
    mutate
  }
}
