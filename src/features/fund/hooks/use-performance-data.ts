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
    year === null ? null : ["cashflow", year],
    () => (year === 9999 ? getCashflowAllTime() : getCashflow(year!)),
    swrOptions,
  )
}

export function useStockPnl(year: number | null) {
  return useSWR<StockPnl[], Error>(
    year === null ? null : ["stock-pnl", year],
    () => (year === 9999 ? getStocksAll() : getStocks(year!)),
    swrOptions,
  )
}

export function useProfit(year: number | null) {
  return useSWR<ProfitView, Error>(
    year === null ? null : ["profit", year],
    () => (year === 9999 ? getProfitAllTime() : getProfit(year!)),
    swrOptions,
  )
}

export function useBenchmark(year: number | null) {
  return useSWR<BenchmarkView, Error>(
    year === null ? null : ["benchmark", year],
    () => (year === 9999 ? getReturnAllTime() : getReturn(year!)),
    swrOptions,
  )
}
