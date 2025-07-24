"use client"

import { DebtItem, DebtItemSkeleton } from "@/components/list-item/debt"
import { PageContent, PageHeader, PageMain } from "@/components/page-layout"
import { Tables } from "@/lib/database.types"
import { format } from "date-fns"
import { BottomNavBar } from "@/components/menu/bottom-nav"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useAuth } from "@/hooks/useAuth"

export default function Page() {
  const { session } = useAuth()
  const userId = session?.user?.id
  const { data: debts, error } = useSWR<Tables<"debts">[]>(
    userId ? `/api/query/${userId}/debts` : null,
    fetcher
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
    <PageMain>
      <PageHeader title="Debts" />
      <PageContent>
        {error && <p>Error loading debts.</p>}
        {!debts && !error &&
        <>
          <DebtItemSkeleton />
          <DebtItemSkeleton />
          <DebtItemSkeleton />
        </>
        }
        {debts && debts.length === 0 && <p>No outstanding debt found.</p>}
        {debts && debts.map((debt) => (
          <DebtItem
            key={debt.id}
            name={debt.lender_name}
            amount={debt.principal_amount}
            interestRate={debt.interest_rate}
            startDate={format(debt.start_date, "dd MMMM yyyy")}
            accruedInterest={calculateAccruedInterest(debt)}
          />
        ))}
      </PageContent>
      <BottomNavBar />
    </PageMain>
  )
}