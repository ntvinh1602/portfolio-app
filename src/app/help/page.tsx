"use client"

import { HelpAccordion } from "@/components/help-accordion"
import { BottomNavBar } from "@/components/menu/bottom-nav"
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
      {!isMobile && <AppSidebar />}
      <SidebarInset className={!isMobile ? "px-6" : undefined}>
        <Header title="Help"/>
        <HelpAccordion />
      </SidebarInset>
      {isMobile && <BottomNavBar />}
    </SidebarProvider>
  )
}
