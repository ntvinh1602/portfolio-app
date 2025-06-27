import { TransactionImportForm } from "@/components/transaction-import-form";
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

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
        <SiteHeader title="Import Data" />
        <div className="flex flex-col gap-4 p-4">
          <TransactionImportForm />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}