'use client'

import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function ClearCacheButton() {
  const handleClick = async () => {
    try {
      const response = await fetch('/api/revalidate-user', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to clear cache')
      }

      toast.success("Your cache has been cleared.")
    } catch {
      toast.error("Failed to clear your cache.")
    }
  }

  return (
    <Button onClick={handleClick}>Clear Cache</Button>
  )
}