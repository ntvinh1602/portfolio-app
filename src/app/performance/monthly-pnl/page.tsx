"use client"

import * as React from "react"
import {
  PageMain,
  PageHeader,
  PageContent
} from "@/components/page-layout"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import TabSwitcher from "@/components/tab-switcher"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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
import { Button } from "@/components/ui/button"
import {
  endOfMonth,
  format,
  startOfMonth,
  sub,
} from "date-fns"
import { supabase } from "@/lib/supabase/supabaseClient"
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
    <div className="flex flex-col gap-2 px-1">
      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="h-10"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      className="text-secondary-foreground"
                      key={header.id}
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="h-10 bg-muted/50"
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
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
        <div className="text-muted-foreground text-xs">
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

export default function Page() {
  const [dateRange, setDateRange] = React.useState("12m")
  const [data, setData] = React.useState<MonthlyData[]>([])
  const [avgPnl, setAvgPnl] = React.useState(0)
  const [avgTwr, setAvgTwr] = React.useState(0)

  React.useEffect(() => {
    const fetchData = async () => {
      const now = new Date()
      let startDate
      const endDate = format(endOfMonth(now), "yyyy-MM-dd")

      if (dateRange === "12m") {
        startDate = format(startOfMonth(sub(now, { months: 11 })), "yyyy-MM-dd")
      } else {
        const { data: firstSnapshot, error } = await supabase
          .from("daily_performance_snapshots")
          .select("date")
          .order("date", { ascending: true })
          .limit(1)
          .single()

        if (error) {
          console.error("Error fetching first snapshot date:", error)
          startDate = format(startOfMonth(sub(now, { years: 5 })), "yyyy-MM-dd")
        } else {
          startDate = firstSnapshot.date
        }
      }

      try {
        const [pnlResponse, twrResponse] = await Promise.all([
          fetch(
            `/api/performance/pnl?start_date=${startDate}&end_date=${endDate}`
          ),
          fetch(
            `/api/performance/twr?start_date=${startDate}&end_date=${endDate}`
          ),
        ])

        const pnlData = await pnlResponse.json()
        const twrData = await twrResponse.json()

        if (pnlResponse.ok && twrResponse.ok) {
          const combinedData = pnlData.map((pnlItem: any) => {
            const twrItem = twrData.find(
              (t: any) => t.month === pnlItem.month
            )
            return {
              ...pnlItem,
              twr: twrItem ? twrItem.twr : 0,
            }
          })
          setData(combinedData)

          if (combinedData.length > 0) {
            const totalPnl = combinedData.reduce(
              (acc: number, item: MonthlyData) => acc + item.pnl,
              0
            )
            const totalTwr = combinedData.reduce(
              (acc: number, item: MonthlyData) => acc + item.twr,
              0
            )
            setAvgPnl(totalPnl / combinedData.length)
            setAvgTwr(totalTwr / combinedData.length)
          }
        } else {
          console.error("Failed to fetch data")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }

    fetchData()
  }, [dateRange])

  const tabOptions = [
    { value: "12m", label: "Last 12 months" },
    { value: "all", label: "All Time" },
  ]

  return (
    <PageMain>
      <PageHeader title="Monthly PnL" />
      <PageContent>
        <TabSwitcher
          options={tabOptions}
          onValueChange={setDateRange}
          value={dateRange}
          defaultValue="12m"
        />
        <Card className="bg-muted/50 mx-1 shadow-none">
          <CardHeader className="flex justify-between gap-6">
            <div className="flex flex-col w-full items-center">
              <CardDescription>Avg. P/L</CardDescription>
              <CardTitle className="text-xl">
                {formatNum(avgPnl)}
              </CardTitle>
            </div>
            <div className="h-12">
              <Separator orientation="vertical" />
            </div>
            <div className="flex flex-col w-full items-center">
              <CardDescription>Avg. Return</CardDescription>
              <CardTitle className="text-xl">
                {new Intl.NumberFormat("en-US", {
                  style: "percent",
                  minimumFractionDigits: 2,
                }).format(avgTwr)}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
        <PnLTable data={data} />
      </PageContent>
    </PageMain>
  )
}