"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DnseAccountOption } from "@/features/dnse/types"

interface Props {
  accounts: DnseAccountOption[]
  selectedAccountNo: string
}

export function DnseAccountSelector({ accounts, selectedAccountNo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleValueChange = (nextAccountNo: string) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("accountNo", nextAccountNo)

    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`)
    })
  }

  return (
    <Select value={selectedAccountNo} onValueChange={handleValueChange}>
      <SelectTrigger className="min-w-64 data-[size=default]:h-12" disabled={isPending}>
        <SelectValue placeholder="Select account"/>
      </SelectTrigger>
      <SelectContent align="end">
        {accounts.map((account) => (
          <SelectItem key={account.value} value={account.value}>
            <div className="flex flex-col">
              <span>{account.label}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {account.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
