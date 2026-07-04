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