import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/hooks/useAuth"
import {
  calculateCAGR,
  calculateSharpeRatio,
} from "@/lib/utils"
import { lifetime } from "@/lib/start-dates"
import { AssetSummaryData } from "@/types/assets"
import { StockHolding, CryptoHolding } from "@/types/holdings"

type EquityData = {
  date: string
  net_equity_value: number
}

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}


interface HoldingsData {
  stockHoldings: (StockHolding & { total_amount: number })[]
  cryptoHoldings: (CryptoHolding & { total_amount: number })[]
}

interface DashboardApiResponse {
  ytdReturnData: number | null
  lifetimeReturnData: number | null
  monthlyReturnData: number[]
  lifetimePnLData: number | null
  ytdPnLData: number | null
  mtdPnLData: number | null
  equityData: EquityData[]
  last90DBenchmarkData: BenchmarkData[]
  ytdBenchmarkData: BenchmarkData[]
  lifetimeBenchmarkData: BenchmarkData[]
  assetSummaryData: AssetSummaryData | null
  holdingsData: HoldingsData
}

export function useDashboardData() {
  const { userId } = useAuth()
  const { data, error, isLoading } = useSWR<DashboardApiResponse>(
    () => {
      if (!userId) return null
 
      return `/api/gateway/${userId}/dashboard`
    },
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )
 
  const years =
    (new Date().getTime() - new Date(lifetime).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
 
  const cagr =
    data?.lifetimeReturnData !== null && data?.lifetimeReturnData !== undefined && years > 0
      ? calculateCAGR(1, 1 + data.lifetimeReturnData, years)
      : null
 
  const sharpeRatio =
    data?.monthlyReturnData && data.monthlyReturnData.length > 0
      ? calculateSharpeRatio(data.monthlyReturnData, 0.055)
      : null
 
  return {
    ytdReturnData: data?.ytdReturnData ?? null,
    lifetimeReturnData: data?.lifetimeReturnData ?? null,
    lifetimePnLData: data?.lifetimePnLData ?? null,
    ytdPnLData: data?.ytdPnLData ?? null,
    mtdPnLData: data?.mtdPnLData ?? null,
    equityData: data?.equityData ?? [],
    last90DBenchmarkData: data?.last90DBenchmarkData ?? [],
    ytdBenchmarkData: data?.ytdBenchmarkData ?? [],
    lifetimeBenchmarkData: data?.lifetimeBenchmarkData ?? [],
    assetSummaryData: data?.assetSummaryData ?? null,
    holdingsData: data?.holdingsData ?? null,
    cagr,
    sharpeRatio,
    isLoading,
    error,
  }
}