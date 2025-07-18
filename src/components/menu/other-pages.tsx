"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Coins,
  HandCoins,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

interface OtherPagesMenuProps {
  onMenuItemClick: (path: string) => void
  children: React.ReactNode
}

const menuItems = [
  { icon: Wallet, label: "Active Holdings", path: "/holdings" },
  { icon: HandCoins, label: "Outstanding Debts", path: "/debts" },
  { icon: Coins, label: "Transaction History", path: "/transactions" },
  { icon: TrendingUp, label: "Monthly P/L", path: "/earnings" },
  { icon: TrendingDown, label: "Expenses Analysis", path: "/expenses" },
]

export function OtherPagesMenu({
  onMenuItemClick,
  children,
}: OtherPagesMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="rounded-2xl bg-card/25 backdrop-blur-sm mb-4"
      >
        {menuItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => onMenuItemClick(item.path)}
            className="gap-2 justify-end"
          >
            <span>{item.label}</span>
            <item.icon className="stroke-[1]" />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}