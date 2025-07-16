"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { formatNum } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

type MonthlyData = {
  month: string
  pnl: number
  twr: number
}

export const columns: ColumnDef<MonthlyData>[] = [
  {
    accessorKey: "month",
    header: () => <div className="pl-2">Month</div>,
    cell: ({ row }) => {
      const month = row.getValue("month") as string
      const formatted = format(new Date(month + "-02"), "MMM yyyy")
      return <div className="pl-2">{formatted}</div>
    },
  },
  {
    accessorKey: "pnl",
    header: () => <div className="text-right pr-6">Net Profit / Loss</div>,
    cell: ({ row }) => {
      const pnl = parseFloat(row.getValue("pnl"))
      const formatted = formatNum(pnl)

      return <div className="text-right pr-6">{formatted}</div>
    },
  },
  {
    accessorKey: "twr",
    header: () => <div className="text-right pr-2">Return</div>,
    cell: ({ row }) => {
      const twr = parseFloat(row.getValue("twr"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 2,
      }).format(twr)

      return <div className="text-right pr-2">{formatted}</div>
    },
  },
]

export function PnLTable({ data }: { data: MonthlyData[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "month", desc: true },
  ])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 12,
  })

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination,
    },
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader className="bg-accent">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="h-10">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="bg-card/0 text-background dark:text-foreground">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="h-10 bg-card/40"
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft />
        </Button>
        <div className="text-muted-foreground font-thin text-sm">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <Button
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}