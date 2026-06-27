import { createClient } from "@/lib/supabase/server"
import { cacheLife, cacheTag } from "next/cache"
import type { Asset } from "@fund/fund.types"

export default async function getBalanceSheet() {
  "use cache: private"
  cacheTag("dashboard", "analytics")
  cacheLife("days")

  const supabase = await createClient()
  const { data, error } = await supabase.from("balance_sheet").select("*")

  if (error) throw new Error(error.message)

  const rawData = (data as Asset[]) ?? []

  const liability = rawData
    .filter((r) => r.asset_class === "liability")
    .reduce((sum, r) => sum + r.total_value, 0)

  const equity = rawData
    .filter((r) => r.asset_class === "equity")
    .reduce((sum, r) => sum + r.total_value, 0)

  const cash = rawData
    .filter((r) => r.asset_class == "cash")
    .reduce((sum, r) => sum + r.total_value, 0)

  const stock = rawData
    .filter((r) => r.asset_class == "stock")
    .reduce((sum, r) => sum + r.total_value, 0)

  const fund = rawData
    .filter((r) => r.asset_class == "fund")
    .reduce((sum, r) => sum + r.total_value, 0)

  const debt = rawData.find((r) => r.ticker == "DEBTS")?.total_value || 0
  const margin = rawData.find((r) => r.ticker == "MARGIN")?.total_value || 0

  return {
    bsData: rawData,
    liability,
    equity,
    cash,
    stock,
    fund,
    debt,
    margin,
  }
}
