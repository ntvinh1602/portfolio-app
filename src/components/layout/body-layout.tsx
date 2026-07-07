import { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Toaster } from "sonner"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/header-bar"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Toaster />
        <AppSidebar collapsible="icon" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col px-4 xl:px-6 pt-6 group-has-data-[collapsible=icon]/sidebar-wrapper:mt-12">{children}</div>
        </SidebarInset>
      </SidebarProvider> 
    </TooltipProvider>
  )
}
