"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuSub } from "@radix-ui/react-dropdown-menu"
import { Button } from "@/components/ui/button"
import { SquarePen, PlusIcon, Upload } from "lucide-react"
import { TransactionImportForm } from "@/components/transaction/import-form"
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
          <PlusIcon />
          Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="rounded-2xl bg-card/25 backdrop-blur-sm"
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SquarePen />
            Manual Input
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {transactionTypes.map(type => (
                <DropdownMenuItem
                  key={type}
                  onSelect={() => onMenuItemClick(type)}
                  className="capitalize"
                >
                  {type.replace("_", " ")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={e => e.preventDefault()}>
          <TransactionImportForm>
            <div className="flex items-center gap-2">
              <Upload />
              Batch Upload
            </div>
          </TransactionImportForm>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}