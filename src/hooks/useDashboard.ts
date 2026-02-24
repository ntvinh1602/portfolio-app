"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

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
  profit_chart: {
    revenue: number
    fee: number
    interest: number
    tax: number
    snapshot_date: string
  }[]
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
  profit_chart: []
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
