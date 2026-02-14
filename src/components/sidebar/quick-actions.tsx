"use client"

import { useState } from "react"
import { DailySnapshot } from "./daily-snapshot"
import {
  Group,
  GroupLabel,
  MenuButton,
  MenuItem,
} from "@/components/ui/sidebar"
import { DatabaseBackup, Plus, RefreshCcw, type LucideIcon } from "lucide-react"
import { FormDialogWrapper } from "../add-transactions/form-wrapper"
import { StockForm } from "../add-transactions/form/stockForm"
import { CashflowForm } from "../add-transactions/form/cashflowForm"
import { BorrowForm } from "../add-transactions/form/borrowForm"
import { RepayForm } from "../add-transactions/form/repayForm"

type ActionType = "stock" | "cashflow" | "debt" | "repay"

type ActionItem = {
  text: string
  icon: LucideIcon
  actionType?: ActionType
  onClick: () => void
}

export function QuickActions() {
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)
  const [isBackfillOpen, setBackfillOpen] = useState(false)

  const actions: ActionItem[] = [
    {
      icon: Plus,
      text: "Add Stock Trade",
      actionType: "stock",
      onClick: () => setActiveAction("stock"),
    },
    {
      icon: Plus,
      text: "Add Cashflow Event",
      actionType: "cashflow",
      onClick: () => setActiveAction("cashflow"),
    },
    {
      icon: Plus,
      text: "Add Debt",
      actionType: "debt",
      onClick: () => setActiveAction("debt"),
    },
    {
      icon: Plus,
      text: "Repay Debt",
      actionType: "repay",
      onClick: () => setActiveAction("repay"),
    },
    {
      icon: RefreshCcw,
      text: "Refresh Daily Snapshots",
      onClick: () => setBackfillOpen(true),
    },
    {
      icon: DatabaseBackup,
      text: "Rebuild Ledger",
      onClick: () => setBackfillOpen(true),
    },
  ]

  const formMap: Record<
    ActionType,
    { component: React.ComponentType; title: string; subtitle: string }
  > = {
    stock: {
      component: StockForm,
      title: "Add Stock Event",
      subtitle: "Record orders of stock trading",
    },
    cashflow: {
      component: CashflowForm,
      title: "Add Cashflow Event",
      subtitle: "Record deposit, withdrawal, or transfer operations",
    },
    debt: {
      component: BorrowForm, 
      title: "Add Debt",
      subtitle: "Record new borrowings or loans",
    },
    repay: {
      component: RepayForm,
      title: "Repay Debt",
      subtitle: "Log repayment of debt transactions",
    },
  }

  const activeForm = activeAction ? formMap[activeAction] : null

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

      {/* Generic dialog wrapper */}
      {activeForm && (
        <FormDialogWrapper
          open={!!activeAction}
          onOpenChange={(open) => {
            if (!open) setActiveAction(null)
          }}
          title={activeForm.title}
          subtitle={activeForm.subtitle}
          FormComponent={activeForm.component}
        />
      )}

      <DailySnapshot open={isBackfillOpen} onOpenChange={setBackfillOpen} />
    </Group>
  )
}
