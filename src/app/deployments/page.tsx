"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { TabSwitcher } from "@/components/tab-switcher"
import { DateRange } from "@/components/date-picker"
import { subMonths, format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export default function Page() {

  return (
    <div className="flex flex-col">
      <Header title="Deployments" />
      <Separator className="mb-4" />
      <div className="flex gap-4 flex-1 overflow-hidden w-8/10 mx-auto">

      </div>
    </div>
  )
}
