import { createClient } from "@/lib/supabase/server"
import type { Last1YProfitView } from "@fund/fund.types"

export default async function get1yProfit() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pnl_expense_last1y")
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Last1YProfitView
}
