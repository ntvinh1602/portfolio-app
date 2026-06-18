"use client"

import {
  Card,
  CardContent,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle
} from "lucide-react"

interface CashflowProps {
  deposits: number
  withdrawals: number
  className?: string
}

export function Cashflow({
  deposits,
  withdrawals
}: CashflowProps) {

  const inflow = deposits ?? 0
  const outflow = Math.abs(withdrawals ?? 0)
  const net = inflow + withdrawals

  return (
    <Card>
      <CardHeader>
        <CardDescription>Net Cashflow</CardDescription>
        <CardTitle className="text-2xl">
          {formatNum(Math.abs(net))}
        </CardTitle>
        <CardAction>
          <ArrowLeftRight className="stroke-1" />
        </CardAction>
      </CardHeader>

      <CardContent>
        <ItemGroup className="bg-muted/50 rounded-2xl p-2">
          <Item size="xs">
            <ItemMedia variant="icon">
              <ArrowDownCircle/>
            </ItemMedia>  
            <ItemContent>
              <ItemTitle>Deposit</ItemTitle>
            </ItemContent>
            <ItemContent>
              <ItemTitle>{formatNum(inflow)}</ItemTitle>
            </ItemContent>
          </Item>
          <Item size="xs">
            <ItemMedia variant="icon">
              <ArrowUpCircle/>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Withdrawals</ItemTitle>
            </ItemContent>
            <ItemContent>
              <ItemTitle>{formatNum(outflow)}</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>

      </CardContent>
    </Card>
  )
}