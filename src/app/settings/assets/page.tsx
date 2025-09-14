"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { Header } from "@/components/header"
import { useIsMobile } from "@/hooks/use-mobile"

export default function Page() {
  const isMobile = useIsMobile()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Assets Management"/>
        <div className="grid grid-cols-4 px-0 gap-2 flex-1 overflow-hidden">
          
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
