import { useCallback } from "react"
import { toast } from "sonner"
import { DeleteFlight } from "@flight/actions/delete-flight"

export function useDeleteFlight(onSuccess?: () => void) {
  return useCallback(
    async (flightId: string) => {
      try {
        await DeleteFlight(flightId)
        toast.success("Flight deleted successfully")
        onSuccess?.()
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to delete flight"
        toast.error(message)
      }
    },
    [onSuccess],
  )
}
