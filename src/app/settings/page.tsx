"use client"

import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"
import { ImportForm } from "@/app/settings/components/import-form-content"

export default function Page() {
  const isMobile = useIsMobile()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Settings"/>
        <div className="grid grid-cols-4 px-0 gap-2 flex-1 overflow-hidden">
          <ImportForm />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
