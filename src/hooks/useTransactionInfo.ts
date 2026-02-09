"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface TransactionDetailsParams {
  txn_id: string
  include_expenses?: boolean
}

export function useTransactionDetails({ txn_id, include_expenses = false }: TransactionDetailsParams) {
  const supabase = createClient()

  const fetcher = async () => {
    if (!txn_id) return null

    const { data, error } = await supabase.rpc("get_transaction_details", {
      txn_id,
      include_expenses,
    })

    if (error) throw error
    return data
  }

  const { data, error, isLoading, mutate } = useSWR(
    txn_id ? ["get_transaction_details", txn_id, include_expenses] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  return {
    data,
    isLoading,
    isError: !!error,
    mutate,
  }
}
