"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  TvMinimal,
  Plus,
  Sprout,
  Coins,
  TableOfContents
} from "lucide-react"
import { AddTransactionMenu } from "@/components/menu/add-transaction"
import { OtherPagesMenu } from "@/components/menu/other-pages"
import { TransactionForm } from "@/components/forms/transaction/add-transaction"
import { Enums } from "@/types/database.types"

export function BottomNavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [selectedTransactionType, setSelectedTransactionType] =
    React.useState<Enums<"transaction_type">>("deposit")

  const handleMenuItemClick = (type: Enums<"transaction_type">) => {
    setSelectedTransactionType(type)
    setIsDialogOpen(true)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <div className="fixed bottom-0 w-full px-2 flex h-[70px] justify-around items-center bg-muted/40 dark:bg-card/25 backdrop-blur-sm max-w-6xl mx-auto text-muted-foreground text-xs font-thin [&_svg]:size-5 [&_svg]:stroke-[1]">
      <div
        className={cn("flex flex-col items-center gap-1", {
          "text-primary": pathname === "/",
        })}
        onClick={() => handleNavigation("/")}
      >
        <TvMinimal />Home
      </div>
      <div
        className={cn("flex flex-col items-center gap-1", {
          "text-primary": pathname === "/assets",
        })}
        onClick={() => handleNavigation("/assets")}
      >
        <Sprout />Assets
      </div>
      <AddTransactionMenu onMenuItemClick={handleMenuItemClick}>
        <div className="flex flex-col items-center border bg-primary border-accent/40 text-accent-foreground rounded-full p-3 -m-2">
          <Plus className="text-primary-foreground"/>
        </div>
      </AddTransactionMenu>
      <div
        className={cn("flex flex-col items-center gap-1", {
          "text-primary": pathname === "/transactions",
        })}
        onClick={() => handleNavigation("/transactions")}
      >
        <Coins />Trades
      </div>
      <OtherPagesMenu onMenuItemClick={handleNavigation}>
        <div
          className={cn("flex flex-col items-center gap-1", {
            "text-primary": [
              "/holdings",
              "/debts",
              "/metrics",
              "/earnings",
              "/expenses",
            ].includes(pathname),
          })}
        >
          <TableOfContents />Others
        </div>
      </OtherPagesMenu>
      <TransactionForm
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transactionType={selectedTransactionType}
      />
    </div>
  )
}