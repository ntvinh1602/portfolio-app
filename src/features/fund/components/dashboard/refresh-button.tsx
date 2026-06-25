"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"

export function RefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const toastId = toast.loading("Refreshing prices...")

    try {
      const supabase = createClient()

      const { data, error } = await supabase.functions.invoke(
        "fetch-yahoofinance",
        {
          body: { name: "Functions" },
        },
      )

      if (error) throw new Error(error.message ?? "Failed to refresh prices")

      toast.success(data.message, {
        id: toastId,
        description: `Updated items: ${data.updated}`,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh prices"
      toast.error(message, { id: toastId })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="rounded-2xl"
    >
      {isRefreshing ? (
        <div className="flex items-center gap-1">
          <Spinner />
          Updating
        </div>
      ) : (
        <span>Update Price</span>
      )}
    </Button>
  )
}
