import { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Toaster } from "sonner"
import { AppSidebar } from "@/components/layout/sidebar-main"
import { SiteHeader } from "@/components/layout/header-bar"
import { createClient } from "@/lib/supabase/server"

export default async function PageLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_settings")
    .select("display_name, avatar")
    .single()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Toaster />
        <AppSidebar collapsible="icon" />
        <SidebarInset>
          <SiteHeader displayName={data?.display_name} avatar={data?.avatar} />
          <div className="flex flex-1 flex-col px-4 xl:px-6 pt-6 group-has-data-[collapsible=icon]/sidebar-wrapper:mt-12">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
