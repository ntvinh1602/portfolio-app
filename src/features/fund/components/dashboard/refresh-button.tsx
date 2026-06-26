"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"

export default function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Fetching latest prices...")

    try {
      const supabase = createClient()

      const { data, error } = await supabase.functions.invoke(
        "fetch-yahoofinance",
        {
          body: { name: "Functions" },
        },
      )

      if (error) throw new Error(error.message ?? "Failed to update prices")

      toast.success(data.message, {
        id: toastId,
        description: `Updated items: ${data.updated}`,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update prices"
      toast.error(message, { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      size="icon-sm"
      variant="outline"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw className={`${isRefreshing && "animate-spin"}`} />
    </Button>
  )
}
