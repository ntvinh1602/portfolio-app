"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Enums } from "@/types/database.types"

type AddTransactionMenuProps = {
  align?: "center" | "end"
  onMenuItemClick: (type: Enums<"transaction_type">) => void
  children: React.ReactNode
}

export function AddTransactionMenu({ align = "center", onMenuItemClick, children }: AddTransactionMenuProps) {
  const transactionTypes: Enums<"transaction_type">[] = [
    "buy", "sell", "deposit", "withdraw", "income", "expense",
    "borrow", "debt_payment", "dividend", "split"
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="rounded-2xl bg-card/25 backdrop-blur-sm mb-4"
      >
        {transactionTypes.map(type => (
          <DropdownMenuItem
            key={type}
            onSelect={() => onMenuItemClick(type)}
            className="capitalize"
          >
            {type.replace("_", " ")}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}