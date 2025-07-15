"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
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

export default function Page() {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNavigation = () => {
    router.push("/helps")
  }

  return (
    <PageMain>
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
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
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
          <CardContent className="flex justify-end">
            <TransactionImportForm>
              <Button>Import Data</Button>
            </TransactionImportForm>
          </CardContent>
        </Card>
      </PageContent>
    </PageMain>
  )
}
