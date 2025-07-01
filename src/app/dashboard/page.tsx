import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PageHeader } from "@/components/page-header"

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
        <PageHeader title="Dashboard" />
      </SidebarInset>
    </SidebarProvider>
  )
}