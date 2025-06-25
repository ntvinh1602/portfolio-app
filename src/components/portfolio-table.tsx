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
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"

const stocks = [
  {
    ticker: "HPG",
    quantity: "60,000",
    mkt_price: "27.25",
    amount: "1,0234,0234,212 VND",
  },
  {
    ticker: "FPT",
    quantity: "10,000",
    mkt_price: "105.000",
    amount: "234,0234,212 VND",
  },
  {
    ticker: "MBB",
    quantity: "5,000",
    mkt_price: "25.86",
    amount: "4,0234,212 VND",
  },
]

const crypto = [
  {
    ticker: "BTC",
    quantity: "0.005",
    mkt_price: "90,000.00 USD",
    amount: "$450.00",
  },
  {
    ticker: "ETH",
    quantity: "0.005",
    mkt_price: "90,000.00 USD",
    amount: "$450.00",
  },
]

export function TableDemo() {
  return (
    <Card className="flex flex-col">
      <h1 className="text-xl font-bold px-6">
        Portfolio
      </h1>
      <div className="flex flex-col gap-4 w-full">
        <CardHeader>
          <CardTitle>Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticker</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Mkt. Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((stock) => (
                <TableRow key={stock.ticker}>
                  <TableCell className="font-medium">{stock.ticker}</TableCell>
                  <TableCell>{stock.quantity}</TableCell>
                  <TableCell>{stock.mkt_price}</TableCell>
                  <TableCell className="text-right">{stock.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">$2,500.00</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </div>
      <div className="flex items-center justify-between px-6">
        <Separator className="w-full" />
      </div>
      <div className="flex flex-col gap-4">
        <CardHeader>
          <CardTitle>Crypto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ticker</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Mkt. Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crypto.map((crypto) => (
                <TableRow key={crypto.ticker}>
                  <TableCell className="font-medium">{crypto.ticker}</TableCell>
                  <TableCell>{crypto.quantity}</TableCell>
                  <TableCell>{crypto.mkt_price}</TableCell>
                  <TableCell className="text-right">{crypto.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">$2,500.00</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}