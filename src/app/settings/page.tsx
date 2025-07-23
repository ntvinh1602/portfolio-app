"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabaseClient"
import {
  PageMain,
  PageHeader,
  PageContent,
} from "@/components/page-layout"
import { BottomNavBar } from "@/components/menu/bottom-nav"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TransactionImportForm } from "@/components/forms/import-data"
import { Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import DatePicker from "@/components/date-picker"
import { Toaster } from "@/components/ui/sonner"
import { ClearCacheButton } from "@/components/forms/clear-cache-button"

export default function Page() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showAuthAlert, setShowAuthAlert] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNavigation = () => {
    router.push("/help")
  }

  const handleBackfill = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const isAnonymous = !user?.email

    if (isAnonymous) {
      setShowAuthAlert(true)
      return
    }

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
        <Card>
          <CardHeader>
            <CardTitle>Clear Cache</CardTitle>
            <CardDescription>
              Manually clear the cache to get the latest data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClearCacheButton />
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
      <BottomNavBar />
      <Dialog open={showAuthAlert} onOpenChange={setShowAuthAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{"You're not logged in"}</DialogTitle>
            <DialogDescription>
              As an guest user, you are not permitted to generate snapshots. Please sign up for an account to use this feature.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowAuthAlert(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageMain>
  )
}
