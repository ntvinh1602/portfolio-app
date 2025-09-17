"use client"

import * as React from "react"
import { toast } from "sonner"
import { refreshData } from "@/lib/refresh"

export function useRefreshPrices() {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Refreshing prices...")

    try {
      const response = await fetch("/api/external/refresh-prices", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Something went wrong", { id: toastId })
        return
      }

      await refreshData("dashboard", "api/gateway/dashboard")

      toast.success(data.message, {
        id: toastId,
        description: `Stocks: ${data.stocks}, Cryptos: ${data.cryptos}, Indices: ${data.indices}`,
      })
    } catch (err) {
      toast.error("Failed to refresh prices", { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  return { isRefreshing, handleRefresh }
}
