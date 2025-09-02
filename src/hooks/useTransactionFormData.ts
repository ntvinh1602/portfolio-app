"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Tables } from "@/types/database.types"

export type AssetWithSecurity = Tables<"assets"> & {
  securities: Tables<"securities">
}

interface TransactionFormData {
  assets: AssetWithSecurity[]
  debts: Tables<"debts">[]
}

export function useTransactionFormData(enabled: boolean = true) {

  const { data, error, isLoading } = useSWR<TransactionFormData>(
    enabled ? `/api/gateway/transaction-form` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  return {
    assets: data?.assets ?? [],
    debts: data?.debts ?? [],
    loading: isLoading,
    error,
  }
}