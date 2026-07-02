import { requestDnse } from "@/features/dnse/client"
import type { DnseClosePrice } from "@/features/dnse/types"

// Close price
export async function getDnseClosePrice(symbol: string) {
  return requestDnse<DnseClosePrice>(
    "GET",
    `/price/${encodeURIComponent(symbol)}/close`,
  )
}
