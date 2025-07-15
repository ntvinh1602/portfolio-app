"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { Enums } from "@/lib/database.types"

type AddTransactionMenuProps = {
  onMenuItemClick: (type: Enums<"transaction_type">) => void
}

export function AddTransactionMenu({ onMenuItemClick }: AddTransactionMenuProps) {
  const transactionTypes: Enums<"transaction_type">[] = [
    "buy", "sell", "deposit", "withdraw", "income", "expense", 
    "borrow", "debt_payment", "dividend", "split"
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <PlusIcon />Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-primary rounded-2xl bg-card/25 backdrop-blur-sm"
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