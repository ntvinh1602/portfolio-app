"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

export function RefreshPricesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

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
 
      toast.success(data.message, {
        id: toastId,
        description: `Stocks: ${data.stocks}, Cryptos: ${data.cryptos}, Indices: ${data.indices}`,
      })
    } catch {
      toast.error("Failed to refresh prices", { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="relative flex items-center justify-center p-2 rounded-xl transition-colors hover:bg-muted"
    >
      <div
        className={`flex items-center justify-center rounded-full p-1 transition-transform ${
          isRefreshing ? "animate-spin" : "group-hover:rotate-6"
        }`}
      >
        <RefreshCw className="size-4" />
      </div>
    </Button>
  )

}
