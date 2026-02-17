"use client"

import { useState } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Plus, type LucideIcon } from "lucide-react"
import { FormDialogWrapper } from "../form/dialog-form-wrapper"
import {
  StockForm,
  CashflowForm,
  BorrowForm,
  RepayForm,
} from "./add-transactions/"

type ActionType = "stock" | "cashflow" | "debt" | "repay"

type ActionItem = {
  text: string
  icon: LucideIcon
  actionType?: ActionType
  onClick: () => void
}

export function QuickActions() {
  const [activeAction, setActiveAction] = useState<ActionType | null>(null)

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
    <SidebarGroup className="gap-2">
      <SidebarGroupLabel className="relative text-xs text-gray-400 before:absolute before:left-0 before:bottom-0 before:h-[1px] before:w-full before:bg-gradient-to-r before:from-transparent before:via-primary/40 before:to-transparent before:drop-shadow-[0_4px_6px_rgba(251,191,36,0.4)]">
        Actions
      </SidebarGroupLabel>

      {actions.map(({ icon: Icon, text, onClick }) => (
        <SidebarMenuItem key={text}>
          <SidebarMenuButton asChild onClick={onClick}>
            <div className="flex items-center gap-3">
              <Icon className="size-4" />
              <span>{text}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
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
    </SidebarGroup>
  )
}
