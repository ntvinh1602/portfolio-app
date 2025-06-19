"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"
import { AppSidebar } from "@/components/nav-sidebar"
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
import { supabase } from "@/lib/supabase/supabaseClient"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { toast } from "sonner"
import { type Database } from "@/lib/database.types"

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

type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
type TransactionLeg = Database["public"]["Tables"]["transaction_legs"]["Row"]
type Account = Database["public"]["Tables"]["accounts"]["Row"]
type Asset = Database["public"]["Tables"]["assets"]["Row"]
type TransactionDetail =
  Database["public"]["Tables"]["transaction_details"]["Row"]

type TransactionWithRelations = Transaction & {
  transaction_details: TransactionDetail | null
  transaction_legs: (TransactionLeg & {
    accounts: Account | null
    assets: Asset | null
  })[]
}

export default function Page() {
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)
  const [data, setData] = React.useState<TransactionLegRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [assetType, setAssetType] = React.useState("stock")

  React.useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      let query = supabase
        .from("transactions")
        .select<string, TransactionWithRelations>(
          `*, transaction_details(*), transaction_legs!inner(*, accounts(*), assets!inner(*))`
        )
        .eq("transaction_legs.assets.asset_class", assetType)

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
          return transaction_legs.map((leg) => ({
            ...leg,
            transaction: restOfTransaction,
          }))
        })
        setData(legRows as TransactionLegRow[])
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [date, assetType])

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
              <Tabs
                defaultValue="stock"
                className="w-full flex-col justify-start gap-6"
                onValueChange={setAssetType}
                value={assetType}
              >
                <Select
                  defaultValue="stock"
                  onValueChange={setAssetType}
                  value={assetType}
                >
                  <SelectTrigger
                    className="flex w-fit @4xl/main:hidden"
                    size="sm"
                    id="view-selector"
                  >
                    <SelectValue placeholder="Select a view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="epf">EPF</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
                <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
                  <TabsTrigger value="cash">Cash</TabsTrigger>
                  <TabsTrigger value="stock">Stock</TabsTrigger>
                  <TabsTrigger value="epf">EPF</TabsTrigger>
                  <TabsTrigger value="crypto">Crypto</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <DateRangePicker selected={date} onSelect={setDate} />
                <Button variant="default" size="sm">
                  <IconPlus className="size-4" />
                  <span className="hidden sm:inline">Add Transaction</span>
                </Button>
              </div>
            </div>
            <TransactionTable data={data} loading={loading} assetType={assetType} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
