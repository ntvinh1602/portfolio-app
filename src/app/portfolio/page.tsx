import { AppSidebar } from "@/components/nav-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DataTableDemo } from "@/components/portfolio-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

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
        <SiteHeader title="Portfolio"/>
        <div className="w-full max-w-5xl grid grid-cols-2 p-2 gap-2 xl:grid-cols-3 xl:p-4 xl:gap-4 xl:mx-auto">
          <div className="col-span-2 lg:col-span-1">
          </div>
          <div className="col-span-2">
            <Card className="flex flex-col">
              <h1 className="text-lg font-semibold px-6">
                Portfolio
              </h1>
              <div className="flex flex-col gap-4 w-full">
                <CardHeader>
                  <CardTitle>Stocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTableDemo />
                </CardContent>
                <div className="flex items-center justify-between px-6">
                  <Separator className="w-full" />
                </div>
                <CardHeader>
                  <CardTitle>Crypto</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTableDemo />
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
