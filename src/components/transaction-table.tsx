"use client"

import * as React from "react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"
import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type Database } from "@/lib/database.types"
import { Label } from "@/components/ui/label"
import {
  IconArrowsDownUp,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronLeft,
  IconChevronRight,
  IconDotsVertical,
  IconPlus,
} from "@tabler/icons-react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
import { TransactionForm } from "@/components/transaction-form"
import DateRangePicker from "@/components/date-range-picker"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

// Define the structure of our data, combining tables from Supabase
type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
type TransactionLeg = Database["public"]["Tables"]["transaction_legs"]["Row"]
type TransactionDetail = Database["public"]["Tables"]["transaction_details"]["Row"]
type Account = Database["public"]["Tables"]["accounts"]["Row"]
type Asset = Database["public"]["Tables"]["assets"]["Row"]

type TransactionWithRelations = Transaction & {
  transaction_details: TransactionDetail | null
  transaction_legs: (TransactionLeg & {
    accounts: Account | null
    assets: Asset | null
  })[]
}

export type TransactionLegRow = TransactionLeg & {
  transaction: Transaction
  accounts: Account | null
  assets: Asset | null
}


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

export function TransactionTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 15,
  })
  const [date, setDate] = React.useState<DateRange | undefined>(undefined)
  const [data, setData] = React.useState<TransactionLegRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [assetType, setAssetType] = React.useState("stock")
  const isMobile = useIsMobile()
  const columns: ColumnDef<TransactionLegRow>[] = React.useMemo(
    () => [
      {
        id: "transaction.transaction_date",
        accessorKey: "transaction.transaction_date",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              <span className="pl-2">Date</span>
              <IconArrowsDownUp className="h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const dateFormat = isMobile ? "dd/MM/yy" : "dd/MM/yyyy"
          const date = new Date(row.original.transaction.transaction_date)
          return <span className="pl-2">{format(date, dateFormat)}</span>
        },
      },
      {
        id: "transaction.type",
        accessorKey: "transaction.type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.transaction.type.replace("_", " ")}
          </Badge>
        ),
      },
      {
        id: "assets.ticker",
        accessorKey: "assets.ticker",
        header: "Ticker",
      },
      {
        id: "transaction.description",
        accessorKey: "transaction.description",
        header: "Description",
      },
      {
        id: "quantity",
        accessorKey: "quantity",
        header: () => {
          const label = isMobile ? "Qty." : "Quantity"
          return <div className="text-right">{label}</div>
        },
        cell: ({ row }) => {
          const quantity = row.original.quantity
          return (
            <div className="text-right">
              {new Intl.NumberFormat("en-US", {}).format(quantity)}
            </div>
          )
        },
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
          const amount = row.original.amount
          const currency = row.original.currency_code || "USD"

          // Get currency-specific formatting options
          const formatter = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
          })
          const { minimumFractionDigits, maximumFractionDigits } =
            formatter.resolvedOptions()

          return (
            <div className="text-right">
              {new Intl.NumberFormat("en-US", {
                minimumFractionDigits,
                maximumFractionDigits,
              }).format(amount)}{" "}
              {currency}
            </div>
          )
        },
      },
      {
        id: "actions",
        cell: () => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <IconDotsVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Details</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [isMobile]
  )

  React.useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      let query = supabase
        .from("transactions")
        .select<string, TransactionWithRelations>(
          `*, transaction_details(*), transaction_legs!inner(*, accounts(*), assets!inner(*))`
        )
        .eq("transaction_legs.assets.asset_class", assetType)

      if (assetType === "cash") {
        query = query.not("type", "in", "(buy,sell,split)")
      }

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

  const visibleColumns = React.useMemo(() => {
    if (assetType === "cash") {
      return columns.filter(
        (c) => c.id !== "assets.ticker" && c.id !== "quantity"
      )
    }
    if (assetType === "stock") {
      return columns.filter((c) => c.id !== "transaction.description")
    }
    if (assetType === "epf") {
      return columns.filter(
        (c) => c.id !== "assets.ticker")
    }
    return columns
  }, [assetType, columns])

  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: {
      sorting,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="@container/main flex flex-1 flex-col w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between py-4 px-4">
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
          <TransactionForm>
            <Button variant="default" size="sm">
              <IconPlus className="size-4" />
              <span className="hidden sm:inline">Add Transaction</span>
            </Button>
          </TransactionForm>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border mx-4">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center"
                >
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.original.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  className="h-24 text-center"
                >
                  No transaction entries found for the selected date range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[15, 25, 40].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
