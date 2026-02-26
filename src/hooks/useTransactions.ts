"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { startOfDay, endOfDay } from "date-fns"

export interface Transaction {
  id: string
  created_at: string
  category: string
  operation: string
  value: number
  memo: string
}

export interface UseTransactionsParams {
  startDate: Date
  endDate: Date
}

const supabase = createClient()

async function fetchTransactions(
  startISO: string,
  endISO: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("tx_summary")
    .select()
    .order("created_at", { ascending: false })
    .gte("created_at", startISO)
    .lte("created_at", endISO)

  if (error) {
    throw error
  }

  return (data ?? []) as Transaction[]
}

export function useTransactions({
  startDate,
  endDate,
}: UseTransactionsParams) {
  // Normalize to full-day boundaries (financially correct behavior)
  const startISO = startOfDay(startDate).toISOString()
  const endISO = endOfDay(endDate).toISOString()

  // Stable primitive cache key (never use raw objects)
  const key = ["transactions", startISO, endISO]

  const { data, error, isLoading, mutate } = useSWR<Transaction[]>(
    key,
    () => fetchTransactions(startISO, endISO),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  )

  return {
    data: data ?? [],
    isLoading,
    error,
    mutate,
  }
}