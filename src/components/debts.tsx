"use client"

import { Button } from "@/components/ui/button"
import { DebtItem, DebtItemSkeleton } from "@/components/list-item/debt"
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import { useAuth } from "@/hooks/useAuth"
import { fetcher } from "@/lib/fetcher"
import { Tables } from "@/types/database.types"
import { format } from "date-fns"
import useSWR from "swr"

export function Debts() {
  const { userId } = useAuth()
  const { data: debts, error } = useSWR<Tables<"debts">[]>(
    userId ? `/api/query/${userId}/debts` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  const calculateAccruedInterest = (debt: Tables<"debts">): number => {
    const principal = debt.principal_amount
    const annualRate = debt.interest_rate / 100
    const startDate = new Date(debt.start_date)
    const today = new Date()

    if (startDate > today) {
      return 0
    }

    const timeDifference = today.getTime() - startDate.getTime()
    const daysPassed = Math.floor(timeDifference / (1000 * 3600 * 24))

    // Assuming daily compounding (n=365)
    const dailyRate = annualRate / 365
    const totalAmount = principal * Math.pow(1 + dailyRate, daysPassed)
    const interest = totalAmount - principal

    return interest
  }

  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle className="font-light text-xl">Active Debts</SheetTitle>
        <SheetDescription className="font-light">
          Only long-term debts. Not including margin debts.
        </SheetDescription>
      </SheetHeader>
      <div className="px-2">
        {error && <p>Error loading debts.</p>}
        {!debts && !error && (
          <>
            <DebtItemSkeleton />
            <DebtItemSkeleton />
            <DebtItemSkeleton />
          </>
        )}
        {debts && debts.length === 0 && <p>No outstanding debt found.</p>}
        {debts &&
          debts.map(debt => (
            <DebtItem
              key={debt.id}
              name={debt.lender_name}
              amount={debt.principal_amount}
              interestRate={debt.interest_rate}
              startDate={format(debt.start_date, "dd MMMM yyyy")}
              accruedInterest={calculateAccruedInterest(debt)}
            />
          ))}
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button variant="outline">Close</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  )
}
