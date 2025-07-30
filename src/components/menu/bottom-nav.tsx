"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  TvMinimal,
  Plus,
  Sprout,
  Gauge,
  TableOfContents
} from "lucide-react"
import { AddTransactionMenu } from "@/components/menu/add-transaction"
import { OtherPagesMenu } from "@/components/menu/other-pages"
import { TransactionForm } from "@/components/forms/transaction/add-transaction"
import { Enums } from "@/lib/database.types"

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
    <div className="fixed bottom-0 w-full px-2 flex h-[70px] justify-around items-center bg-card/25 backdrop-blur-sm max-w-4xl mx-auto text-muted-foreground text-xs font-thin [&_svg]:size-5 [&_svg]:stroke-[1]">
      <div
        className={cn("flex flex-col items-center gap-1", {
          "text-accent dark:text-accent-foreground": pathname === "/",
        })}
        onClick={() => handleNavigation("/")}
      >
        <TvMinimal />Home
      </div>
      <div
        className={cn("flex flex-col items-center gap-1", {
          "text-accent dark:text-accent-foreground": pathname === "/assets",
        })}
        onClick={() => handleNavigation("/assets")}
      >
        <Sprout />Assets
      </div>
      <AddTransactionMenu onMenuItemClick={handleMenuItemClick}>
        <div className="flex flex-col items-center border bg-secondary dark:bg-primary/50 border-accent/40 text-accent-foreground rounded-full p-3 -m-2">
          <Plus />
        </div>
      </AddTransactionMenu>
      <div
        className={cn("flex flex-col items-center gap-1", {
          "text-accent dark:text-accent-foreground": pathname === "/metrics",
        })}
        onClick={() => handleNavigation("/metrics")}
      >
        <Gauge />Metrics
      </div>
      <OtherPagesMenu onMenuItemClick={handleNavigation}>
        <div
          className={cn("flex flex-col items-center gap-1", {
            "text-accent dark:text-accent-foreground": [
              "/holdings",
              "/debts",
              "/transactions",
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