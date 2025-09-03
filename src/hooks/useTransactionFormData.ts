"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { Tables } from "@/types/database.types"

interface TransactionFormData {
  assets: Tables<"assets">[]
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