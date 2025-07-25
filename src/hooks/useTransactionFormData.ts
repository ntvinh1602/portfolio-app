"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/hooks/useAuth"
import { Tables } from "@/lib/database.types"

export type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">
}

interface TransactionFormData {
  accounts: Tables<"accounts">[]
  assets: AssetWithSecurity[]
  debts: Tables<"debts">[]
}

export function useTransactionFormData(enabled: boolean = true) {
  const { session } = useAuth()
  const userId = session?.user?.id

  const { data, error, isLoading } = useSWR<TransactionFormData>(
    userId && enabled ? `/api/gateway/${userId}/transactions` : null,
    fetcher
  )

  return {
    accounts: data?.accounts ?? [],
    assets: data?.assets ?? [],
    debts: data?.debts ?? [],
    loading: isLoading,
    error,
  }
}