import { requestDnse } from "@/lib/dnse/client"
import type { DnseClosePrice } from "@/lib/dnse/dnse.types"

// Close price
export async function getDnseClosePrice(symbol: string) {
  return requestDnse<DnseClosePrice>(
    "GET",
    `/price/${encodeURIComponent(symbol)}/close`,
  )
}
