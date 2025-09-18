"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { LiveDataProvider } from "@/context/live-data-context"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  
  return (
    <SidebarProvider>
      <LiveDataProvider>
        <AppSidebar collapsible="icon"/>
          <SidebarInset className={`flex flex-col ${!isMobile && "px-4 h-svh"}`}>
            <Header title="Dashboard"/>
            {children}
        </SidebarInset>
      </LiveDataProvider>
    </SidebarProvider>
  )
}
