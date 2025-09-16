"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { refreshData } from "@/lib/refresh"
import { Button } from "../ui/button"

export function RefreshPricesButton() {
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Refreshing prices...")

    try {
      const response = await fetch('/api/external/refresh-prices', { method: 'POST' })
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
      console.error(err)
      toast.error("Failed to refresh prices", { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      variant="outline"
      disabled={isRefreshing}
      onClick={handleRefresh}
      className="flex items-center"
    >
      <RefreshCw className={`size-4 text-muted-foreground ${isRefreshing
        ? "animate-spin"
        : ""}`
      }/>
      <span className="font-light text-muted-foreground">Refresh Prices</span>
    </Button>
  )
}
