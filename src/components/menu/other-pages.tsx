"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Gauge,
  HandCoins,
  TrendingDown,
  TrendingUp,
  Boxes,
} from "lucide-react"

interface OtherPagesMenuProps {
  onMenuItemClick: (path: string) => void
  children: React.ReactNode
}

const menuItems = [
  { icon: Boxes, label: "Active Holdings", path: "/holdings" },
  { icon: HandCoins, label: "Active Debts", path: "/debts" },
  { icon: Gauge, label: "Performance", path: "/metrics" },
  { icon: TrendingUp, label: "Monthly Earnings", path: "/earnings" },
  { icon: TrendingDown, label: "Expenses Analysis", path: "/expenses" },
]

export function OtherPagesMenu({
  onMenuItemClick,
  children,
}: OtherPagesMenuProps) {
  const pathname = usePathname()

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
            className={`gap-2 justify-end ${
              pathname === item.path ? "text-primary" : ""
            }`}
          >
            <span>{item.label}</span> 
            <item.icon className={`stroke-[1] ${
              pathname === item.path ? "text-primary" : ""
            }`} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}