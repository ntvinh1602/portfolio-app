import { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Toaster } from "sonner"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { SiteHeader } from "@/components/header-bar"

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Toaster />
        <AppSidebar collapsible="icon" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col p-4 xl:p-6 mt-16 group-has-data-[collapsible=icon]/sidebar-wrapper:mt-12">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
