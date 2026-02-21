"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

export function RefreshPricesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Refreshing prices...")

    try {
      const supabase = createClient()

      // ✅ call the Edge Function deployed as "fetch-yahoofinance"
      const { data, error } = await supabase.functions.invoke('fetch-yahoofinance', {
        body: { name: 'Functions' },
      })

      if (error) throw new Error(error.message ?? "Failed to refresh prices")

      toast.success(data.message, {
        id: toastId,
        description: `Stocks: ${data.stocks}, Cryptos: ${data.cryptos}, Indices: ${data.indices}`,
      })
    } catch (err: any) {
      toast.error(err.message ?? "Failed to refresh prices", { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="rounded-full"
    >
      <div
        className={`flex items-center justify-center rounded-full p-1 transition-transform ${
          isRefreshing ? "animate-spin" : ""
        }`}
      >
        <RefreshCw className="size-4" />
      </div>
    </Button>
  )
}
