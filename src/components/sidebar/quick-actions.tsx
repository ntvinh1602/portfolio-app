"use client"

import { useState } from "react"
import { DailySnapshot } from "./daily-snapshot"
import {
  Group,
  GroupLabel,
  MenuButton,
  MenuItem,
} from "@/components/ui/sidebar"
import { Plus, RefreshCw, ListRestart, type LucideIcon } from "lucide-react"
import { TransactionForm } from "@/components/sidebar/add-transaction/form-wrapper"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

type ActionItem = {
  text: string
  icon: LucideIcon
  onClick: () => void
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
      toast.success("Assets refreshed successfully")
    }
  }

  // Flattened list of actions
  const actions: ActionItem[] = [
    {
      icon: Plus,
      text: "Add Transaction",
      onClick: () => setTxnFormOpen(true),
    },
    {
      icon: RefreshCw,
      text: "Refresh Assets",
      onClick: refreshAssets,
    },
    {
      icon: ListRestart,
      text: "Refresh Snapshots",
      onClick: () => setBackfillOpen(true),
    },
  ]

  return (
    <Group className="gap-2">
      <GroupLabel className="relative text-xs font-light text-gray-400 before:absolute before:left-0 before:bottom-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:drop-shadow-[0_4px_6px_rgba(251,191,36,0.4)]">
        Actions
      </GroupLabel>
      {actions.map(({ icon: Icon, text, onClick }) => (
        <MenuItem key={text}>
          <MenuButton asChild onClick={onClick}>
            <div className="flex items-center gap-3">
              <Icon className="size-4" />
              <span className="font-light">{text}</span>
            </div>
          </MenuButton>
        </MenuItem>
      ))}
      <TransactionForm open={isTxnFormOpen} onOpenChange={setTxnFormOpen} />
      <DailySnapshot open={isBackfillOpen} onOpenChange={setBackfillOpen} />
    </Group>
  )
}
