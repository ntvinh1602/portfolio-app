import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { format, subDays, startOfMonth, subMonths } from "date-fns"

type EquityData = {
  date: string
  net_equity_value: number
}

type MonthlyPnlData = {
  month: string
  pnl: number
}

type BenchmarkData = {
  date: string
  portfolio_value: number
  vni_value: number
}

interface SummaryItem {
  type: string;
  totalAmount: number;
}

interface AssetSummaryData {
  assets: SummaryItem[];
  totalAssets: number;
  liabilities: SummaryItem[];
  totalLiabilities: number;
  equity: SummaryItem[];
  totalEquity: number;
}

import { Holding, CryptoHolding } from "./useHoldings";

interface HoldingsData {
  stockHoldings: (Holding & { total_amount: number })[];
  cryptoHoldings: (CryptoHolding & { total_amount: number })[];
}

interface DashboardApiResponse {
  equityData: EquityData[];
  twrData: { twr: number | null };
  monthlyPnlData: MonthlyPnlData[];
  benchmarkData: BenchmarkData[];
  assetSummaryData: AssetSummaryData | null;
  holdingsData: HoldingsData;
}

export function useDashboardData() {
  const endDate = new Date()
  const startDate = subDays(endDate, 90)
  const monthlyPnlStartDate = startOfMonth(subMonths(endDate, 11))

  const params = new URLSearchParams({
    start_date: format(startDate, "yyyy-MM-dd"),
    end_date: format(endDate, "yyyy-MM-dd"),
    monthly_pnl_start_date: format(monthlyPnlStartDate, "yyyy-MM-dd"),
  })

  const { data, error, isLoading } = useSWR<DashboardApiResponse>(
    `/api/gateway/dashboard?${params.toString()}`,
    fetcher
  )

  return {
    equityData: data?.equityData ?? [],
    twr: data?.twrData?.twr ?? null,
    monthlyPnlData: data?.monthlyPnlData ?? [],
    benchmarkData: data?.benchmarkData ?? [],
    assetSummaryData: data?.assetSummaryData ?? null,
    holdingsData: data?.holdingsData ?? { stockHoldings: [], cryptoHoldings: [] },
    isLoading,
    error,
  };
}