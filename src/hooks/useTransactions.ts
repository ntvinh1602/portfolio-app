"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

interface UseTransactionsParams {
  startDate?: Date
  endDate?: Date
}

// Create a single supabase client for client-side usage
const supabase = createClient()

async function fetchTransactions({ startDate, endDate }: UseTransactionsParams) {
  let query = supabase
    .from("tx_summary")
    .select()
    .order("created_at", { ascending: false })

  if (startDate) query = query.gte("created_at", format(startDate, "yyyy-MM-dd"))
  if (endDate) query = query.lte("created_at", format(endDate, "yyyy-MM-dd"))

  const { data, error } = await query

  if (error) throw error
  return data as {
    id: string
    created_at: string
    category: string
    operation: string
    value: number
    memo: string
  }[]
}

export function useTransactions(params: UseTransactionsParams) {
  const key = params.startDate || params.endDate ? ["transactions", params] : "transactions"

  const { data, error, isLoading, mutate } = useSWR(key, () => fetchTransactions(params), {
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
