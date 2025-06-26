"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import * as React from "react"
import { Separator } from "@/components/ui/separator"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  Row,
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
import { Button } from "@/components/ui/button"
import {
  ChevronDownIcon,
  ChevronUpIcon
} from "lucide-react"

type SubItem = {
  costBasis: number
  amount: number
  netPL: number
}

type Holding = {
  ticker: string
  quantity: number
  marketPrice: number
  subRows?: SubItem[]
}

const data: Holding[] = [
  {
    ticker: "HPG",
    quantity: 1000,
    marketPrice: 28.5,
    subRows: [
      {
        costBasis: 25.0,
        amount: 25000,
        netPL: 3500,
      },
    ],
  },
  {
    ticker: "FPT",
    quantity: 500,
    marketPrice: 130.2,
    subRows: [
      {
        costBasis: 110.0,
        amount: 55000,
        netPL: 10100,
      },
    ],
  },
  {
    ticker: "MBB",
    quantity: 2000,
    marketPrice: 23.8,
    subRows: [
      {
        costBasis: 22.0,
        amount: 44000,
        netPL: 3600,
      },
    ],
  },
  {
    ticker: "TCB",
    quantity: 1500,
    marketPrice: 58.1,
    subRows: [
      {
        costBasis: 50.5,
        amount: 75750,
        netPL: 11400,
      },
    ],
  },
]

const subColumns: ColumnDef<SubItem>[] = [
  {
    accessorKey: "costBasis",
    header: "Cost Basis",
    cell: ({ getValue }) => `$${(getValue() as number).toFixed(2)}`,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ getValue }) => `$${(getValue() as number).toFixed(2)}`,
  },
  {
    accessorKey: "netPL",
    header: "Net P/L",
    cell: ({ getValue }) => `$${(getValue() as number).toFixed(2)}`,
  },
]

const RenderSubComponent = ({ row }: { row: Row<Holding> }) => {
  const subTable = useReactTable({
    data: row.original.subRows ?? [],
    columns: subColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table>
      <TableHeader>
        {subTable.getHeaderGroups().map((headerGroup) => (
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
        {subTable.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function HoldingTable() {
  const columns: ColumnDef<Holding>[] = [
    {
      accessorKey: "ticker",
      header: "Ticker",
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "marketPrice",
      header: () => <div className="text-right">Market Price</div>,
      cell: ({ getValue }) => 
        <div className="text-right">
          ${(getValue() as number).toFixed(2)}
        </div>,
    },
    {
      id: "expander",
      cell: ({ row, table }) => (
        <div className="text-right">
          <Button
            className="size-8 p-0"
            variant="ghost"
            size="icon"
            onClick={() => {
              if (row.getIsExpanded()) {
                row.toggleExpanded(false)
              } else {
                table.resetExpanded()
                row.toggleExpanded(true)
              }
            }}
          >
            {row.getIsExpanded() ? (
              <ChevronUpIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  })

  return (
    <Card className="flex flex-col">
      <h1 className="text-lg font-semibold px-6">
        Current Holdings
      </h1>
      <div className="flex flex-col gap-4 w-full">
        <CardHeader>
          <CardTitle>Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-accent">
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
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length}>
                        <RenderSubComponent row={row} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </div>
      <div className="flex items-center justify-between px-6">
        <Separator className="w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <CardHeader>
          <CardTitle>Cryptocurrencies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-accent">
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
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (
                    <TableRow>
                      <TableCell colSpan={row.getVisibleCells().length}>
                        <RenderSubComponent row={row} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
     </div>
    </Card>
  )
}