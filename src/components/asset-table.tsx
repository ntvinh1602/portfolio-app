"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { AssetSummaryData } from "@/app/assets/page";

interface DisplayItem {
  type: string;
  totalAmount: string;
}

export function AssetTable({ data }: { data: AssetSummaryData | null }) {
  const formatCurrency = (amount: number, currency: string) => {
    return `${new Intl.NumberFormat().format(amount)} ${currency}`;
  };

  const assets: DisplayItem[] = data?.assets.map(asset => ({
    ...asset,
    totalAmount: formatCurrency(asset.totalAmount, data.displayCurrency)
  })) || [];

  const totalAssets = data ? formatCurrency(data.totalAssets, data.displayCurrency) : "$0.00";

  const liabilities: DisplayItem[] = data?.liabilities.map(liability => ({
    ...liability,
    totalAmount: formatCurrency(liability.totalAmount, data.displayCurrency)
  })) || [];

  const totalLiabilities = data ? formatCurrency(data.totalLiabilities, data.displayCurrency) : "$0.00";

  const equity: DisplayItem[] = data?.equity.map(item => ({
    ...item,
    totalAmount: formatCurrency(item.totalAmount, data.displayCurrency)
  })) || [];

  const totalEquity = data ? formatCurrency(data.totalEquity, data.displayCurrency) : "$0.00";

  return (
    <Card className="flex flex-col">
      <h1 className="text-xl font-bold px-6">
        Balance Sheet
      </h1>
      <div className="flex flex-col gap-4 w-full">
        <CardHeader>
          <CardTitle>Total Assets</CardTitle>
          <CardDescription>
            Assets by investment type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-accent">
              <TableRow>
                <TableHead className="text-left px-4">Assets</TableHead>
                <TableHead className="text-right px-4">{totalAssets}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow className="border-hidden" key={asset.type}>
                  <TableCell className="font-normal px-4">{asset.type}</TableCell>
                  <TableCell className="text-right px-4">{asset.totalAmount}</TableCell>
                </TableRow>
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
          <CardTitle>Total Liabilities</CardTitle>
          <CardDescription>
            Assets by funding type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Table>
              <TableHeader className="bg-accent"> 
                <TableRow>
                  <TableHead className="text-left px-4">Liabilities</TableHead>
                  <TableHead className="text-right px-4">{totalLiabilities}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilities.map((liability) => (
                  <TableRow className="border-hidden" key={liability.type}>
                    <TableCell className="font-normal px-4">{liability.type}</TableCell>
                    <TableCell className="text-right px-4">{liability.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Table>
              <TableHeader className="bg-accent">
                <TableRow>
                  <TableHead className="text-left px-4">Equity</TableHead>
                  <TableHead className="text-right px-4">{totalEquity}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equity.map((item) => (
                  <TableRow className="border-hidden" key={item.type}>
                    <TableCell className="font-normal px-4">{item.type}</TableCell>
                    <TableCell className="text-right px-4">{item.totalAmount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}