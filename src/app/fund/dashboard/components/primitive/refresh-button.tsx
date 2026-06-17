"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { mutate } from 'swr'

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Refreshing prices...")

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.functions.invoke('fetch-yahoofinance', {
        body: { name: 'Functions' },
      })

      if (error) throw new Error(error.message ?? "Failed to refresh prices")

      toast.success(data.message, {
        id: toastId,
        description: `Updated items: ${data.updated}`,
      })
      
      await mutate(
        (key) => Array.isArray(key) && key[0] === "priceRefresh",
        undefined,
        { revalidate: true }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh prices"
      toast.error(message, { id: toastId })
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
        <RefreshCw className="size-4 text-foreground/80" />
      </div>
    </Button>
  )
}
