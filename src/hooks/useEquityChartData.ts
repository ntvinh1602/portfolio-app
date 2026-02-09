import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

interface EquityChartParams {
  time: string // e.g., "1y" | "6m" | "3m" | "all" | "2024"
}

interface EquityChartResponse {
  date: string
  net_equity_value: number
  total_cashflow: number
}

export function useEquityChartData({ time }: EquityChartParams) {
  const shouldFetch = !!time
  const { data, error, isLoading, mutate } = useSWR<EquityChartResponse[]>(
    shouldFetch ? `/api/gateway/equity-chart-data?time=${time}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate,
    isError: Boolean(error),
  }
}
