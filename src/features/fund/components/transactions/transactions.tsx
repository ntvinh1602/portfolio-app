"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { FormDialogWrapper } from "@/components/form/form-wrapper"
import { PlusIcon } from "lucide-react"
import { PageTitle } from "@/components/page-title"
import { useTransactions } from "./context"
import { TransactionsFilterSection } from "./transactions-filter-section"
import { TransactionsListSection } from "./transactions-list-section"

export function Transactions() {
  const {
    open,
    setOpen,
    handleOpenForm,
    currentConfig,
    triggerRefresh,
  } = useTransactions()

  return (
    <div className="@container/main flex flex-1 flex-col ">
      <div className="flex flex-col w-full xl:max-w-280 gap-4 mx-auto">
        <PageTitle title="Transaction Events">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-2xl">
                <PlusIcon />
                Add Event
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={() => handleOpenForm("stock")}>
                Stock Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenForm("cashflow")}>
                Cashflow Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenForm("borrow")}>
                Borrow Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleOpenForm("repay")}>
                Repay Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {currentConfig && (
            <FormDialogWrapper
              open={open}
              onOpenChange={(value) => {
                setOpen(value)
              }}
              title={currentConfig.title}
              subtitle={currentConfig.subtitle}
              FormComponent={currentConfig.Component}
              onSuccess={triggerRefresh}
            />
          )}
        </PageTitle>
        <div className="flex flex-col w-full gap-8">
          <TransactionsFilterSection />
          <TransactionsListSection />
        </div>
      </div>
    </div>
  )
}
