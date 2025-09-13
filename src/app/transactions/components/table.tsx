"use client"

import * as React from "react"
import { Database } from "@/types/database.types"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pagination } from "./pagination"
import { Skeleton } from "@/components/ui/skeleton"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  category: string
  onRowClick?: (row: TData) => void
  selectedTransaction?: TData | null
  loading: boolean
}

export function Transactions<TData extends { id: string }, TValue>({
  columns,
  data,
  category,
  onRowClick,
  selectedTransaction,
  loading
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
      initialState: {
        pagination: {
          pageSize: 20,
        },
      },
      state: {
        sorting,
        columnFilters
      }
    })

  React.useEffect(() => {
    const transactionTypes: Database["public"]["Enums"]["transaction_type"][] = [
      "buy",
      "sell",
      "deposit",
      "withdraw",
      "income",
      "expense",
      "dividend",
      "split",
      "borrow",
      "debt_payment"
    ]

    const CATEGORY_FILTERS: Record<string, typeof transactionTypes> = {
      cash: transactionTypes.filter((t) => !["buy", "sell"].includes(t)),
      trade: ["buy", "sell"],
    }

    table.getColumn("type")?.setFilterValue(CATEGORY_FILTERS[category] ?? [])
  }, [category, table])

  if (loading) {
    return (
      <>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="bg-muted font-light"
                        style={{
                          minWidth: header.column.columnDef.size,
                          maxWidth: header.column.columnDef.size,
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {Array.from({ length: 20 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {table.getAllLeafColumns().map((column) => (
                    <TableCell
                      key={column.id}
                      style={{
                        minWidth: column.columnDef.size,
                        maxWidth: column.columnDef.size,
                      }}
                    >
                      <Skeleton className="h-5.5 w-7/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Pagination table={table}/>
      </>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="bg-muted font-light"
                      style={{
                        minWidth: header.column.columnDef.size,
                        maxWidth: header.column.columnDef.size,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!loading && table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={
                    (row.original as any).id === (selectedTransaction as any)?.id &&
                    "selected"
                  }
                  onClick={() => onRowClick?.(row.original)}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        minWidth: cell.column.columnDef.size,
                        maxWidth: cell.column.columnDef.size,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination table={table}/>
    </>
  )
}