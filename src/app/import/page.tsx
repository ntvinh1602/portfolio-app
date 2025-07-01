import { TransactionImportForm } from "@/components/transaction/import-form";
import { AppSidebar } from "@/components/sidebar/sidebar"
import { PageHeader } from "@/components/page-header"
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
        <PageHeader title="Import Data" />
        <div className="flex flex-col gap-4 p-4">
          <TransactionImportForm />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}