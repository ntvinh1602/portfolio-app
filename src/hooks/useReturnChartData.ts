import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

interface ReturnChartParams {
  time: string // e.g., "1y" | "6m" | "3m" | "all" | "2024"
}

interface ReturnChartResponse {
  date: string
  portfolio_value: number
  vni_value: number
}

export function useReturnChartData({ time }: ReturnChartParams) {
  const shouldFetch = !!time
  const { data, error, isLoading, mutate } = useSWR<ReturnChartResponse[]>(
    shouldFetch ? `/api/gateway/return-chart-data?time=${time}` : null,
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
