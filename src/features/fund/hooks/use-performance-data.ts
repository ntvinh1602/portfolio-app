"use client"

import useSWR from "swr"
import {
  getCashflow,
  getCashflowAllTime,
  getStocks,
  getStocksAll,
  getProfit,
  getProfitAllTime,
  getReturn,
  getReturnAllTime,
} from "@fund/actions/get-performance"
import type {
  CashflowView,
  StockPnl,
  ProfitView,
  BenchmarkView,
} from "@fund/fund.types"

const swrOptions = { revalidateOnFocus: false }

export function useCashflow(year: number | null) {
  return useSWR<CashflowView, Error>(
    ["cashflow", year],
    () => (year === null ? getCashflowAllTime() : getCashflow(year)),
    swrOptions,
  )
}

export function useStockPnl(year: number | null) {
  return useSWR<StockPnl[], Error>(
    ["stock-pnl", year],
    () => (year === null ? getStocksAll() : getStocks(year)),
    swrOptions,
  )
}

export function useProfit(year: number | null) {
  return useSWR<ProfitView, Error>(
    ["profit", year],
    () => (year === null ? getProfitAllTime() : getProfit(year)),
    swrOptions,
  )
}

export function useBenchmark(year: number | null) {
  return useSWR<BenchmarkView, Error>(
    ["benchmark", year],
    () => (year === null ? getReturnAllTime() : getReturn(year)),
    swrOptions,
  )
}
