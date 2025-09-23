import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { refreshData } from "@/lib/refresh"
import {
  Root,
  Content,
  Trigger
} from "@/components/ui/tooltip"

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

      await refreshData("dashboard", "api/gateway/dashboard")

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
  <Root>
    <Trigger asChild>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
        <span className="sr-only">Refresh Prices</span>
      </Button>
    </Trigger>
    <Content>
      Fetch latest stock, crypto and VN-Index prices from Yahoo Finance
    </Content>
  </Root>
  )
}
