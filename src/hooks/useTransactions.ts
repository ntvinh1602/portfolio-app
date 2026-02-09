"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface UseTransactionsParams {
  startDate?: string
  endDate?: string
}

// Create a single supabase client for client-side usage
const supabase = createClient()

async function fetchTransactions({ startDate, endDate }: UseTransactionsParams) {
  let query = supabase
    .from("transactions")
    .select()
    .is("linked_txn", null)
    .order("created_at", { ascending: false })

  if (startDate) query = query.gte("transaction_date", startDate)
  if (endDate) query = query.lte("transaction_date", endDate)

  const { data, error } = await query

  if (error) throw error
  return data
}

export function useTransactions(params: UseTransactionsParams) {
  const key = params.startDate || params.endDate ? ["transactions", params] : "transactions"

  const { data, error, isLoading, mutate } = useSWR(key, () => fetchTransactions(params), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  return {
    transactions: data,
    isLoading,
    isError: !!error,
    mutate,
  }
}
