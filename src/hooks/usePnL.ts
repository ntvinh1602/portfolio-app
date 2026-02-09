import useSWR from "swr"
import { createClient } from "@supabase/supabase-js"
import { 
  startOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  startOfDay
} from "date-fns"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function fetchPnL(p_start_date: string, p_end_date: string) {
  const { data, error } = await supabase.rpc("calculate_pnl", {
    p_start_date,
    p_end_date,
  })
  if (error) throw error
  return data
}

/**
 * usePnL - fetches PnL data by year or by rolling period.
 * @param range - can be a year ("2024") or a period ("1m", "3m", "6m", "all")
 */
export function usePnL(range: string) {
  // Compute start/end dates based on the range
  const today = startOfDay(new Date())
  let startDate: Date
  let endDate: Date = today

  if (/^\d{4}$/.test(range)) {
    // Year mode: e.g., "2024"
    const year = parseInt(range, 10)
    startDate = startOfYear(new Date(year, 0, 1))
    endDate = endOfYear(new Date(year, 0, 1))
  } else {
    // Rolling mode: e.g., "1m", "3m", "6m", "all"
    switch (range) {
      case "1m":
        startDate = subMonths(today, 1)
        break
      case "3m":
        startDate = subMonths(today, 3)
        break
      case "6m":
        startDate = subMonths(today, 6)
        break
      case "1y":
        startDate = subMonths(today, 12)
        break
      case "mtd":
        startDate = startOfMonth(today)
        break
      case "ytd":
        startDate = startOfYear(today)
        break
      case "all":
        startDate = new Date(2000, 0, 1) // arbitrary early date — depends on your data
        break
      default:
        throw new Error(`Invalid range: ${range}`)
    }
  }

  const p_start_date = startDate.toISOString().slice(0, 10)
  const p_end_date = endDate.toISOString().slice(0, 10)

  return useSWR(
    ["calculate_pnl", range], // use range as cache key for simplicity
    () => fetchPnL(p_start_date, p_end_date),
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000 * 60 * 5, // cache 5 minutes
    }
  )
}
