"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Enums } from "@/lib/database.types"

type AddTransactionMenuProps = {
  onMenuItemClick: (type: Enums<"transaction_type">) => void
  children: React.ReactNode
}

export function AddTransactionMenu({ onMenuItemClick, children }: AddTransactionMenuProps) {
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
        align="center"
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