"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SingleDate } from "@/components/date-picker"
import { refreshData } from "@/lib/refresh"

export function DailySnapshot({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [startDate, setStartDate] = useState<Date | undefined>()

  const handleBackfill = async () => {
    if (!startDate) {
      toast.error("Please select a start date.")
      return
    }

    const toastId = toast.loading("Starting backfill process...")

    try {
      const response = await fetch("/api/database/backfill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ startDate: startDate.toISOString().split("T") })
      })

      if (!response.ok) {
        throw new Error("Failed to start backfill process.")
      }

      toast.success("Backfill process started successfully.", {
        id: toastId
      })

      // ✅ Tell SWR to refetch dashboard data
      await refreshData("dashboard", "api/gateway/dashboard")
    } catch {
      toast.error("An error occurred while starting the backfill process.", {
        id: toastId
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        showCloseButton={false}
        className="w-100"
      >
        <DialogHeader>
          <DialogTitle>Generate Snapshots</DialogTitle>
          <DialogDescription>
            Initialize or recalculate daily portfolio snapshots data from a specific date.
          </DialogDescription>
        </DialogHeader>
        <SingleDate selected={startDate} onSelect={setStartDate} />
        <Button variant="outline" onClick={handleBackfill}>
          Generate
        </Button>
      </DialogContent>
    </Dialog>
  )
}