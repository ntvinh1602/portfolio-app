"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

type StockPnl = {
  ticker: string
  name: string
  logo_url: string
  total_pnl: number
}

type ProfitChart = {
  revenue: number
  fee: number
  interest: number
  tax: number
  snapshot_date: string
}

type ReturnChart = {
  snapshot_date: string
  vni_value: number
  portfolio_value: number
}

type Reports = {
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

const EMPTY_REPORTS: Reports = [{
  year: 0,
  stock_pnl: [],
  total_pnl: 0,
  avg_profit: 0,
  avg_expense: 0,
  profit_chart: [],
  deposits: 0,
  withdrawals: 0,
  equity_ret: 0,
  vn_ret: 0,
  return_chart: []
}]

export function useReports() {
  const fetchReports = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("reports_data")
      .select()
      
    if (error) throw new Error(error.message)
    return data as Reports
  }

  const { data, error, isLoading, mutate } = useSWR(
    ["reports", "priceRefresh"],
    fetchReports,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000 * 60 * 10,
    }
  )

  return {
    data: data ?? EMPTY_REPORTS,
    isLoading,
    error,
    mutate
  }
}
