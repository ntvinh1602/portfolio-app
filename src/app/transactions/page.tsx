"use client"

import * as React from "react"
import { AppSidebar } from "@/components/sidebar/sidebar"
import { SiteHeader } from "@/components/site-header"
import { TransactionCard } from "@/components/transaction-card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import DatePicker from "@/components/date-picker"
import { type DateRange } from "react-day-picker"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { TransactionForm } from "@/components/transaction-form"
import { PlusIcon } from "lucide-react"

type TransactionFeed = {
  transaction_id: string
  transaction_date: string
  type: string
  description: string | null
  ticker: string
  name: string
  logo_url: string | null
  quantity: number
  amount: number
  currency_code: string
}

export default function Page() {
  const [transactions, setTransactions] = React.useState<TransactionFeed[]>([])
  const [loading, setLoading] = React.useState(true)
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)

  React.useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_transaction_feed')

      if (error) {
        toast.error("Failed to fetch transaction feed: " + error.message)
        setTransactions([])
      } else {
        setTransactions(data || [])
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [])

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
        <SiteHeader title="Transactions" />
        <Card className="bg-background shadow-none border-none gap-4 px-6 py-2 w-full max-w-4xl xl:mx-auto">
          <div className="flex items-center justify-between">
            <DatePicker
              mode="range"
              selected={date}
              onSelect={setDate}
            />
            <TransactionForm>
              <Button variant="default" className="rounded-full">
                <PlusIcon className="size-4" />
                Transaction
              </Button>
            </TransactionForm>
          </div>
          <div className="flex flex-col gap-2 max-w-4xl xl:mx-auto w-full">
            {loading ? (
              <p>Loading...</p>
            ) : (
              transactions.map((tx) => (
                <TransactionCard
                  key={tx.transaction_id}
                  ticker={tx.ticker}
                  name={tx.name}
                  logoUrl={tx.logo_url || ''}
                  amount={formatCurrency(tx.amount)}
                  quantity={formatCurrency(tx.quantity, tx.currency_code)}
                  type={tx.type}
                  description={tx.description || ''}
                  currencyCode={tx.currency_code}
                  transactionDate={tx.transaction_date}
                />
              ))
            )}
          </div>
        </Card>
      </SidebarInset>
    </SidebarProvider>
  )
}
