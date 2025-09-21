import * as React from "react"
import { DailySnapshot } from "./daily-snapshot"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useRefreshPrices } from "@/hooks/useRefreshPrices"
import { ChevronRight, Plus, type LucideIcon, RefreshCw } from "lucide-react"
import { TransactionForm } from "@/components/sidebar/add-transaction/form-wrapper"
import { createClient } from "@/lib/supabase/server"
import { toast } from "sonner"
import { refreshData } from "@/lib/refresh"

type ActionItem = {
  text: string
  onClick: () => void
}

type ActionGroupConfig = {
  icon: LucideIcon
  label: string
  items: ActionItem[]
  isActive: boolean
}

function ActionGroup({ icon, label, items, isActive }: ActionGroupConfig) {
  const Icon = icon
  return (
    <Collapsible defaultOpen={isActive}>
      <CollapsibleTrigger asChild>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <div className="flex select-none font-light">
              <Icon/>
              {label}
            </div>
          </SidebarMenuButton>
          <SidebarMenuAction>
            <ChevronRight />
          </SidebarMenuAction>
        </SidebarMenuItem>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {items.map(({ text, onClick }) => (
            <SidebarMenuSubButton key={text} onClick={onClick}>
              <div className="font-light text-muted-foreground select-none">
                {text}
              </div>
            </SidebarMenuSubButton>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function QuickActions() {
  const { handleRefresh } = useRefreshPrices()
  const [isTxnFormOpen, setTxnFormOpen] = React.useState(false)
  const [isBackfillOpen, setBackfillOpen] = React.useState(false)

  async function refreshAssets() {
  
    const supabase = await createClient()
    const { error } = await supabase.rpc("refresh_assets_quantity")
    if (error) {
      console.error(error)
      toast.error(error.message)
    } else {
      await refreshData("dashboard", "api/gateway/dashboard")
      toast.success("Assets refreshed successfully")
    }
  }

  const groups: ActionGroupConfig[] = [
    {
      icon: Plus,
      label: "Manual Inputs",
      items: [
        { text: "Add Transaction", onClick: () => setTxnFormOpen(true) }
      ],
      isActive: true
    },
    {
      icon: RefreshCw,
      label: "Refresh Data",
      items: [
        { text: "Market Prices", onClick: handleRefresh },
        { text: "Assets Quantity", onClick: refreshAssets },
        { text: "Daily Snapshots", onClick: () => setBackfillOpen(true) },
      ],
      isActive: true
    },
    // You can add more groups here later without touching JSX
  ]

  return (
    <SidebarGroup className="flex gap-1">
      <SidebarGroupLabel>Actions</SidebarGroupLabel>
      {groups.map((group) => (
        <ActionGroup key={group.label} {...group} />
      ))}
      <TransactionForm open={isTxnFormOpen} onOpenChange={setTxnFormOpen} />
      <DailySnapshot open={isBackfillOpen} onOpenChange={setBackfillOpen} />
    </SidebarGroup>
  )
}