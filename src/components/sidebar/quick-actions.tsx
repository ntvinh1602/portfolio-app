import { useState } from "react"
import { DailySnapshot } from "./daily-snapshot"
import {
  Group,
  GroupLabel,
  MenuAction,
  MenuButton,
  MenuItem,
  MenuSub,
  MenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronRight, Plus, type LucideIcon, RefreshCw } from "lucide-react"
import { TransactionForm } from "@/components/sidebar/add-transaction/form-wrapper"
import { createClient } from "@/lib/supabase/client"
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
        <MenuItem>
          <MenuButton asChild>
            <div className="flex select-none font-light">
              <Icon/>
              {label}
            </div>
          </MenuButton>
          <MenuAction>
            <ChevronRight />
          </MenuAction>
        </MenuItem>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <MenuSub>
          {items.map(({ text, onClick }) => (
            <MenuSubButton key={text} onClick={onClick}>
              <div className="font-light text-muted-foreground select-none">
                {text}
              </div>
            </MenuSubButton>
          ))}
        </MenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function QuickActions() {
  const [isTxnFormOpen, setTxnFormOpen] = useState(false)
  const [isBackfillOpen, setBackfillOpen] = useState(false)

  async function refreshAssets() {
  
    const supabase = createClient()
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
        { text: "Assets Quantity", onClick: refreshAssets },
        { text: "Daily Snapshots", onClick: () => setBackfillOpen(true) },
      ],
      isActive: true
    },
    // You can add more groups here later without touching JSX
  ]

  return (
    <Group className="flex gap-1">
      <GroupLabel>Actions</GroupLabel>
      {groups.map((group) => (
        <ActionGroup key={group.label} {...group} />
      ))}
      <TransactionForm open={isTxnFormOpen} onOpenChange={setTxnFormOpen} />
      <DailySnapshot open={isBackfillOpen} onOpenChange={setBackfillOpen} />
    </Group>
  )
}