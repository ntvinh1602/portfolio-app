"use client"

import { DebtItem } from "@/components/list-item/debt"
import { PageContent, PageHeader, PageMain } from "@/components/page-layout"
import { Tables } from "@/lib/database.types"
import { supabase } from "@/lib/supabase/supabaseClient"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { BottomNavBar } from "@/components/menu/bottom-nav"

export default function Page() {
  const [debts, setDebts] = useState<Tables<"debts">[] | null>(null)

  useEffect(() => {
    const fetchDebts = async () => {
      const { data } = await supabase
        .from("debts")
        .select("*")
        .eq("status", "active")
      setDebts(data)
    }

    fetchDebts()
  }, [])

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
        {debts === null
          ? null
          : debts.length === 0
            ? <p>No outstanding debt found.</p>
            : debts.map((debt) => (
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