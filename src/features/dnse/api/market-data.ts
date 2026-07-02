import { requestDnse } from "@/features/dnse/client"
import type { DnseClosePrice } from "@/features/dnse/types"

// Close price
export async function getDnseClosePrice(symbol: string) {
  return requestDnse<DnseClosePrice>(
    "GET",
    `/prices/${encodeURIComponent(symbol)}/close`,
  )
}
