"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FormDialogWrapper } from "@/components/form/form-wrapper"
import { PlusIcon } from "lucide-react"
import { useAddEvent } from "./add-event-context"
import { useTransactionsData } from "./transactions-data-context"

export function AddEventSection() {
  const {
    state: { open, currentConfig },
    actions: { setOpen, openForm },
  } = useAddEvent()
  const {
    actions: { triggerRefresh },
  } = useTransactionsData()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button>
              <PlusIcon />
              Add Event
            </Button>
          }
        ></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem onClick={() => openForm("stock")}>
            Stock Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openForm("cashflow")}>
            Cashflow Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openForm("borrow")}>
            Borrow Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openForm("repay")}>
            Repay Event
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {currentConfig && (
        <FormDialogWrapper
          open={open}
          onOpenChange={setOpen}
          title={currentConfig.title}
          subtitle={currentConfig.subtitle}
          FormComponent={currentConfig.Component}
          onSuccess={triggerRefresh}
        />
      )}
    </>
  )
}
