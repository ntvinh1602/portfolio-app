import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { lifetime, last12M } from "@/lib/start-dates"

type MonthlyData = {
  month: string
  pnl: number
  twr: number
}

export function useEarningsData(dateRange: string) {
  const { data, error, isLoading } = useSWR<MonthlyData[]>(
    dateRange === "12M"
      ? `/api/gateway/earnings?start=${last12M}`
      : `/api/gateway/earnings?start=${lifetime}`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  return {
    data: data ?? [],
    error,
    isLoading,
  }
}