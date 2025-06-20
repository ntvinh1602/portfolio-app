"use client"

import * as React from "react"
import { AppSidebar } from "@/components/nav-sidebar"
import { TransactionTable } from "@/components/transaction-table"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function Page() {

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <TransactionTable />
      </SidebarInset>
    </SidebarProvider>
  )
}
