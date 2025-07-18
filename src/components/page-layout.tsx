"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { HeaderNav } from "@/components/menu/user-nav"
import {
  TvMinimal,
  Plus,
  Sprout,
  Gauge,
  TableOfContents
} from "lucide-react"
import { AddTransactionMenu } from "./menu/add-transaction"
import { OtherPagesMenu } from "./menu/other-pages"
import { TransactionForm } from "./forms/transaction/add-transaction"
import { Enums } from "@/lib/database.types"

interface SiteHeaderProps {
  title?: string
}

function PageHeader({ title = "Untitled" }: SiteHeaderProps) {

  return (
    <header className="flex items-center p-6 max-w-4xl xl:mx-auto w-full">
      <div className="flex w-full justify-between items-center">
        <h1 className="text-accent dark:text-accent-foreground text-3xl font-regular">{title}</h1>
        <HeaderNav />
      </div>
    </header>
  )
}

function PageMain({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      className={cn(
        "relative flex flex-1 flex-col h-full max-w-4xl mx-auto lg:rounded-xl",
        className
      )}
      {...props}
    />
  )
}

function PageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col gap-2 px-6 w-full max-w-4xl xl:mx-auto pb-40",
        className
      )}
      {...props}
    />
  )
}

function BottomNavBar() {
  const router = useRouter()
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
    <div className="fixed bottom-2 inset-x-2 rounded-full px-2 flex border h-[70px] justify-around items-center bg-card/25 backdrop-blur-sm max-w-4xl mx-auto text-muted-foreground text-xs font-thin [&_svg]:size-5 [&_svg]:stroke-[1]">
      <div
        className="flex flex-col items-center gap-1"
        onClick={() => handleNavigation("/")}
      >
        <TvMinimal />Home
      </div>
      <div
        className="flex flex-col items-center gap-1"
        onClick={() => handleNavigation("/assets")}
      >
        <Sprout />Assets
      </div>
      <AddTransactionMenu onMenuItemClick={handleMenuItemClick}>
        <div className="flex flex-col items-center border bg-primary/50 border-accent/40 text-accent-foreground rounded-full p-3 -m-2">
          <Plus />
        </div>
      </AddTransactionMenu>
      <div
        className="flex flex-col items-center gap-1"
        onClick={() => handleNavigation("/analytics")}
      >
        <Gauge />Metrics
      </div>
      <OtherPagesMenu onMenuItemClick={handleNavigation}>
        <div className="flex flex-col items-center gap-1">
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

export {
  PageMain,
  PageHeader,
  PageContent,
  BottomNavBar
}