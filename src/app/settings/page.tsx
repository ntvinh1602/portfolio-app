"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { TransactionImportForm } from "@/components/forms/import-data"
import { Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import DatePicker from "@/components/date-picker"
import { Toaster } from "@/components/ui/sonner"

export default function Page() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNavigation = () => {
    router.push("/helps")
  }

  const handleBackfill = async () => {
    if (!startDate) {
      toast.error("Please select a start date.")
      return
    }

    const toastId = toast.loading("Starting backfill process...")

    try {
      const response = await fetch("/api/backfill", {
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
    } catch {
      toast.error("An error occurred while starting the backfill process.", {
        id: toastId
      })
    }
  }

  return (
    <PageMain>
      <Toaster />
      <PageHeader title="Settings" />
      <PageContent>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent>
            {!mounted ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-6 w-20" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Switch
                  id="dark-mode"
                  checked={resolvedTheme === "dark"}
                  onCheckedChange={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                />
                <Label htmlFor="dark-mode">Dark mode</Label>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="gap-8">
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>
                Upload transaction data for bulk processing
              </CardDescription>
              <CardAction>
                <Info
                  className="size-4"
                  onClick={handleNavigation}
                />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col">
              <TransactionImportForm>
                <Button>Import</Button>
              </TransactionImportForm>
            </CardContent>
          </div>
          <div className="flex flex-col gap-4">
            <CardHeader>
              <CardTitle>Generate Snapshots</CardTitle>
              <CardDescription>
                Initialize or recalculate daily portfolio snapshots data from a specific date.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <DatePicker mode="single" selected={startDate} onSelect={setStartDate} />
              <Button onClick={handleBackfill}>Generate</Button>
            </CardContent>
          </div>
        </Card>
      </PageContent>
    </PageMain>
  )
}
