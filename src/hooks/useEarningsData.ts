import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/hooks/useAuth"
import { lifetime, last12M } from "@/lib/start-dates"

type MonthlyData = {
  month: string
  pnl: number
  twr: number
}

export function useEarningsData(dateRange: string) {
  const { userId } = useAuth()
  const { data, error, isLoading } = useSWR<MonthlyData[]>(
    !userId
      ? null
      : dateRange === "12M"
        ? `/api/gateway/${userId}/earnings?start=${last12M}`
        : `/api/gateway/${userId}/earnings?start=${lifetime}`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  return {
    data: data ?? [],
    error,
    isLoading,
  }
}