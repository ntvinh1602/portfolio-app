"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { Tables } from "@/lib/database.types"

export function useTransactionFormData() {
  const [accounts, setAccounts] = React.useState<Tables<"accounts">[]>([])
  const [assets, setAssets] = React.useState<Tables<"assets">[]>([])
  const [debts, setDebts] = React.useState<Tables<"debts">[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      try {
        const { data: accountsData, error: accountsError } = await supabase
          .from("accounts")
          .select("*")
          .not("type", "eq", "conceptual")
        if (accountsError) throw accountsError
        setAccounts(accountsData || [])

        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select("*")
          .not("asset_class", "in", "(equity,liability)")
        if (assetsError) throw assetsError
        setAssets(assetsData || [])

        const { data: debtsData, error: debtsError } = await supabase
          .from("debts")
          .select("*")
          .eq("status", "active")
        if (debtsError) throw debtsError
        setDebts(debtsData || [])
      } catch (error) {
        console.error("Error fetching transaction form data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  return { accounts, assets, debts, loading }
}