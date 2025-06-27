"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface DisplayItem {
  type: string;
  totalAmount: string;
}

export function AssetTable({
  items,
  totalAmount,
  tableHeader,
}: {
  items: DisplayItem[]
  totalAmount: string
  tableHeader: "Assets" | "Liabilities" | "Equity"
}) {

  return (
    <Table>
      <TableHeader className="bg-accent">
        <TableRow>
          <TableHead className="text-left px-4">{tableHeader}</TableHead>
          <TableHead className="text-right px-4">{totalAmount}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow className="border-hidden" key={item.type}>
            <TableCell className="font-normal px-4">{item.type}</TableCell>
            <TableCell className="text-right px-4">{item.totalAmount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}