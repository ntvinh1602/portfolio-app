import { AppSidebar } from "@/components/nav-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { TableDemo } from "@/components/portfolio-table"

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
        <SiteHeader title="Assets"/>
        <div className="grid grid-cols-2 p-4 gap-4">
          <div className="col-span-2 lg:col-span-1">
          </div>
          <div className="col-span-2 lg:col-span-1">
            <TableDemo />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
