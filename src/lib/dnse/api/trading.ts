import { requestDnse } from "@/lib/dnse/client"
import type { DnseOrderDetailsRes } from "@/lib/dnse/dnse.types"

// Order details
export async function getOrderDetails(accountNo: string, orderId: number) {
  return requestDnse<DnseOrderDetailsRes>(
    "GET",
    `/accounts/${encodeURIComponent(accountNo)}/orders/${encodeURIComponent(orderId)}`,
    {
      query: {
        marketType: "STOCK",
        orderCategory: "NORMAL",
      },
    },
  )
}
