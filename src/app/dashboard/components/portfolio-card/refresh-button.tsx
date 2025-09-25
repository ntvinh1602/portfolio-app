import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { refreshData } from "@/lib/refresh"

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

      await refreshData("dashboard", "/api/gateway/dashboard")
 
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
      className="group relative overflow-hidden transition-all"
    >
      <RefreshCw className={`transition-transform duration-300 group-hover:translate-x-1 ${isRefreshing && "animate-spin"}`} />
      <span className="ml-0 w-0 opacity-0 overflow-hidden transition-all duration-300 group-hover:w-[100px] group-hover:opacity-100">Refresh Prices</span>
    </Button>
  )
}
