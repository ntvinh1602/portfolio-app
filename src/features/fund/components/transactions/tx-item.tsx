"use client"

import {
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  HandCoins,
  Handshake,
  ArrowBigDownDash,
  ArrowBigUpDash,
} from "lucide-react"
import { format } from "date-fns"
import { cn, formatNum } from "@/lib/utils"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import type { Tables } from "@/types/database.types"

type Operation =
  | "buy"
  | "sell"
  | "deposit"
  | "withdraw"
  | "income"
  | "expense"
  | "borrow"
  | "repay"

const txOps = {
  buy: {
    label: "Buy",
    icon: ArrowBigDownDash,
    color: "bg-secondary text-primary",
  },
  sell: {
    label: "Sell",
    icon: ArrowBigUpDash,
    color: "bg-secondary text-destructive",
  },
  deposit: {
    label: "Deposit",
    icon: Download,
    color: "bg-secondary text-primary",
  },
  withdraw: {
    label: "Withdraw",
    icon: Upload,
    color: "bg-secondary text-destructive",
  },
  income: {
    label: "Income",
    icon: TrendingUp,
    color: "bg-secondary text-primary",
  },
  expense: {
    label: "Expense",
    icon: TrendingDown,
    color: "bg-secondary text-destructive",
  },
  borrow: {
    label: "Borrow",
    icon: HandCoins,
    color: "bg-secondary text-primary",
  },
  repay: {
    label: "Repay",
    icon: Handshake,
    color: "bg-secondary text-destructive",
  },
} as const

export function TxnItem({
  transaction,
}: {
  transaction: {
    [K in keyof Tables<"tx_summary">]: NonNullable<Tables<"tx_summary">[K]>
  }
}) {
  const operation = txOps[transaction.operation as Operation]
  const OperationIcon = operation.icon

  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="image">
        <div
          className={cn(
            operation.color,
            "flex aspect-square size-8 items-center justify-center rounded-xl",
          )}
        >
          <OperationIcon className="size-4" />
        </div>
      </ItemMedia>

      <ItemContent>
        <ItemTitle>{transaction.memo}</ItemTitle>
        <ItemDescription className="text-xs">
          {format(new Date(transaction.created_at), "yyyy-MM-dd HH:mm")}
        </ItemDescription>
      </ItemContent>

      <ItemContent className="items-end">
        <ItemTitle>{formatNum(transaction.value)}</ItemTitle>
        <ItemDescription className="text-xs">{operation.label}</ItemDescription>
      </ItemContent>
    </Item>
  )
}
