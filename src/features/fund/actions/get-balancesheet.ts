import { createClient } from "@/lib/supabase/server"
import type { BSheetView } from "@fund/fund.types"

export default async function getBalanceSheet() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("balance_sheet").select()

  if (error) throw new Error(error.message)

  return data as BSheetView[]
}
