"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"
import { AppSidebar } from "@/components/app-sidebar"
import {
  TransactionTable,
  type TransactionLegRow,
} from "@/components/transaction-table"
import DateRangePicker from "@/components/date-range-picker"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { IconPlus } from "@tabler/icons-react"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"


/**
 * Converts a Date object to a YYYY-MM-DD string, ignoring timezone.
 * This is to ensure the correct date is used in the Supabase query.
 * @param date The date to convert.
 * @returns A string in YYYY-MM-DD format.
 */
const toYYYYMMDD = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function Page() {
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)
  const [data, setData] = React.useState<TransactionLegRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      let query = supabase
        .from("transactions")
        .select(
          `*, transaction_details(*), transaction_legs(*, accounts(*), assets(*))`
        )

      if (date?.from) {
        query = query.gte("transaction_date", toYYYYMMDD(date.from))
      }
      if (date?.to) {
        query = query.lte("transaction_date", toYYYYMMDD(date.to))
      }

      const { data: transactions, error } = await query.order(
        "transaction_date",
        { ascending: false }
      )

      if (error) {
        toast.error("Failed to fetch transactions: " + error.message)
      } else {
        const legRows = (transactions || []).flatMap((transaction) => {
          const { transaction_legs, ...restOfTransaction } = transaction
          return (transaction_legs as any[]).map((leg) => ({
            ...leg,
            transaction: restOfTransaction,
          }))
        })
        setData(legRows as TransactionLegRow[])
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [date])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col">
            <div className="flex items-center justify-between py-4 px-4 lg:px-6">
              <DateRangePicker selected={date} onSelect={setDate} />
              <Button variant="outline" size="sm">
                <IconPlus className="mr-2 size-4" />
                Add Transaction
              </Button>
            </div>
            <TransactionTable data={data} loading={loading} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
