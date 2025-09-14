"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImportForm } from "@/app/settings/components/import-form-content"
import { SingleDate } from "@/components/date-picker"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { mutate } from "swr"

export default function Page() {
  const isMobile = useIsMobile()
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
        body: JSON.stringify({ startDate: startDate.toISOString().split("T")[0] })
      })

      if (!response.ok) {
        throw new Error("Failed to start backfill process.")
      }

      toast.success("Backfill process started successfully.", {
        id: toastId
      })

      // ✅ Tell SWR to refetch dashboard data
      await mutate("/api/gateway/dashboard")
    } catch {
      toast.error("An error occurred while starting the backfill process.", {
        id: toastId
      })
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Settings"/>
        <div className="grid grid-cols-4 px-0 gap-2 flex-1 overflow-hidden">
          <ImportForm />
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Generate Snapshots</CardTitle>
              <CardDescription>
                Initialize or recalculate daily portfolio snapshots data from a specific date.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <SingleDate selected={startDate} onSelect={setStartDate} />
              <Button variant="outline" onClick={handleBackfill}>
                Generate
              </Button>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
