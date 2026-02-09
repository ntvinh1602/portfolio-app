"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import * as Dialog from "@/components/ui/dialog"

export function DailySnapshot({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [startDate, setStartDate] = useState<Date | undefined>(new Date())

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

    } catch {
      toast.error("An error occurred while starting the backfill process.", {
        id: toastId
      })
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        onOpenAutoFocus={(e) => e.preventDefault()}
        showCloseButton={false}
        className="w-fit"
      >
        <Dialog.Header>
          <Dialog.Title>Daily Snapshots</Dialog.Title>
          <Dialog.Subtitle className="w-80">
            Calculate daily portfolio snapshots from a chosen date. Earliest date available is 10th Nov 2021.
          </Dialog.Subtitle>
        </Dialog.Header>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          numberOfMonths={1}
          defaultMonth={startDate}
          weekStartsOn={1}
          startMonth={new Date(2021, 10)}
          disabled={{ before: new Date(2021, 10, 10) }}
          selected={startDate}
          onSelect={setStartDate}
          className="rounded-lg border w-80 bg-transparent"
        />
        <Dialog.Footer>
          <Button onClick={handleBackfill}>
            Generate
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )
}