import * as React from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useRefreshPrices } from "@/hooks/useRefreshPrices"
import { Plus, RefreshCw } from "lucide-react"
import { TransactionForm } from "@/components/sidebar/transaction/add-transaction"

export function QuickActions() {
  const { isRefreshing, handleRefresh } = useRefreshPrices()
  const [isTxnFormOpen, setTxnFormOpen] = React.useState(false)

  return (
    <SidebarGroup className="flex gap-1">
      <SidebarGroupLabel>Actions</SidebarGroupLabel>

      <SidebarMenuButton
        onClick={() => setTxnFormOpen(true)}
        tooltip="Add Transaction"
        className="font-light"
      >
        <Plus />Add Transaction
      </SidebarMenuButton>
      
      <SidebarMenuButton
        onClick={handleRefresh}
        tooltip="Refresh Prices"
        disabled={isRefreshing}
        className="font-light"
      >
        <RefreshCw className={`${isRefreshing && "animate-spin"}`}/>
        Refresh Prices
      </SidebarMenuButton>
      
      <TransactionForm
        open={isTxnFormOpen}
        onOpenChange={setTxnFormOpen}
      />
    </SidebarGroup>
  )
}