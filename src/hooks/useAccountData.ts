import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Tables } from "@/types/database.types"

interface TransactionFormData {
  assets: Tables<"assets">[]
  debts: Tables<"debts">[]
}

export function useAccountData() {
  const { data, error, isLoading } = useSWR<TransactionFormData>(
    `/api/gateway/account-data`,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  return {
    assets: data?.assets ?? [],
    debts: data?.debts ?? [],
    loading: isLoading,
    error
  }
}
