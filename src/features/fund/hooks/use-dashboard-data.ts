"use client"

import useSWR from "swr"
import {
  getEquityRolling,
  getBenchmarkRolling,
  getBalanceSheet,
} from "@fund/actions/get-dashboard"
import type {
  EquityRollingView,
  BenchmarkRollingView,
  BSheetView,
} from "@fund/fund.types"

const swrOptions = { revalidateOnFocus: false }

export function useEquityRolling() {
  return useSWR<EquityRollingView, Error>(
    "equity-rolling",
    () => getEquityRolling(),
    swrOptions,
  )
}

export function useBenchmarkRolling() {
  return useSWR<BenchmarkRollingView, Error>(
    "benchmark-rolling",
    () => getBenchmarkRolling(),
    swrOptions,
  )
}

export function useBalanceSheet() {
  return useSWR<BSheetView[], Error>(
    "balance-sheet",
    () => getBalanceSheet(),
    swrOptions,
  )
}
