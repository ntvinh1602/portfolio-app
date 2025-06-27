"use client"

import * as React from "react"
import { formatCurrency } from "@/lib/utils"
import {
  format,
  formatISO
} from "date-fns"
import { type DateRange } from "react-day-picker"
import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TransactionForm } from "@/components/transaction-form"
import DatePicker from "@/components/date-picker"
import { type Database } from "@/lib/database.types"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  EllipsisVertical,
  PlusIcon
} from "lucide-react"
import { supabase } from "@/lib/supabase/supabaseClient"
import { toast } from "sonner"
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
import TabFilter from "@/components/tab-filter"

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
  transaction: Transaction & {
    transaction_details: TransactionDetail | null
  }
  accounts: Account | null
  assets: Asset | null
}

export function TransactionTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 12,
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
              <ChevronsUpDown className="h-4 w-4" />
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
          const currency = row.original.currency_code
          if (assetType === "stock") {
            return (
              <div className="text-right">
                {new Intl.NumberFormat("en-US", {
                  maximumFractionDigits: 0,
                }).format(quantity)}
              </div>
            )
          }

          return (
            <div className="text-right">
              {formatCurrency(quantity, currency)}
            </div>
          )
        },
      },
      {
        id: "price",
        accessorFn: (row) => row.transaction.transaction_details?.price,
        header: () => <div className="text-right">Price</div>,
        cell: ({ cell }) => {
          const price = cell.getValue() as number | null
          if (price === null || typeof price === "undefined") {
            return <div className="text-right">-</div>
          }
          return (
            <div className="text-right">
              {new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2
              }).format(price/1000)}
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
          const currency = "VND"

          return (
            <div className="text-right">
              {formatCurrency(amount, currency)}
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
                  <EllipsisVertical className="size-4" />
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
    [isMobile, assetType]
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
        query = query.gte(
          "transaction_date",
          formatISO(date.from, { representation: "date" })
        )
      }
      if (date?.to) {
        query = query.gte(
          "transaction_date",
          formatISO(date.to, { representation: "date" })
        )
      }

      const { data: transactions, error } = await query.order(
        "transaction_date",
        { ascending: false }
      )

      if (error) {
        toast.error("Failed to fetch transactions: " + error.message)
      } else {
        const legRows: TransactionLegRow[] = (transactions || []).flatMap(
          (transaction) => {
            const { transaction_legs, ...restOfTransaction } = transaction
            return transaction_legs.map((leg) => ({
              ...leg,
              transaction: restOfTransaction,
            }))
          }
        )
        setData(legRows)
      }
      setLoading(false)
    }

    fetchTransactions()
  }, [date, assetType])

  const visibleColumns = React.useMemo(() => {
    if (assetType === "cash") {
      return columns.filter(
        (c) =>
          c.id !== "assets.ticker" &&
          c.id !== "quantity" &&
          c.id !== "price"
      )
    }
    if (assetType === "stock") {
      return columns.filter((c) => c.id !== "transaction.description")
    }
    if (assetType === "epf") {
      return columns.filter(
        (c) => c.id !== "assets.ticker" && c.id !== "price"
      )
    }
    return columns.filter((c) => c.id !== "price")
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

  const tabOptions = [
    { value: "cash", label: "Cash" },
    { value: "stock", label: "Stock" },
    { value: "epf", label: "EPF" },
    { value: "crypto", label: "Crypto" },
  ]

  return (
    <div className="@container flex flex-1 flex-col w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-between py-4 px-4 gap-2">
        <TabFilter
          options={tabOptions}
          onValueChange={setAssetType}
          value={assetType}
          defaultValue="stock"
        />
          <DatePicker
            mode="range"
            selected={date}
            onSelect={setDate}
          />
          <TransactionForm>
            <Button variant="default">
              <PlusIcon className="size-4" />
              <span className="hidden @2xl:inline">Add Transaction</span>
            </Button>
          </TransactionForm>
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
              <SelectTrigger className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[12, 24, 48].map((pageSize) => (
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
              className="hidden p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
