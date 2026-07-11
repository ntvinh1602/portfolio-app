import {
  TrendingUp,
  TrendingDown,
  Upload,
  HandCoins,
  Handshake,
  Calendar,
  Clock,
  PiggyBank,
  ShoppingBag,
  Coins,
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
import { Badge } from "@/components/ui/badge"

type Operation =
  | "buy"
  | "sell"
  | "deposit"
  | "withdraw"
  | "income"
  | "expense"
  | "borrow"
  | "repay"

const OperationCfg = {
  buy: {
    label: "Buy",
    icon: ShoppingBag,
    color: "bg-secondary text-primary",
  },
  sell: {
    label: "Sell",
    icon: Coins,
    color: "bg-secondary text-destructive",
  },
  deposit: {
    label: "Deposit",
    icon: PiggyBank,
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

interface Props {
  tx: {
    [K in keyof Tables<"tx_summary">]: NonNullable<Tables<"tx_summary">[K]>
  }
}

export function TxnItem({ tx }: Props) {
  const operation = OperationCfg[tx.operation as Operation]

  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="image">
        <div
          className={cn(
            operation.color,
            "flex size-8 items-center justify-center rounded-xl",
          )}
        >
          <operation.icon className="size-4" />
        </div>
      </ItemMedia>

      <ItemContent>
        <ItemTitle>{tx.memo}</ItemTitle>
        <ItemDescription className="-ml-2">
          <Badge variant="ghost" className="pointer-events-none">
            <Calendar />
            {format(new Date(tx.created_at), "yyyy-MM-dd")}
          </Badge>
          <Badge variant="ghost" className="pointer-events-none">
            <Clock />
            {format(new Date(tx.created_at), "HH:mm")}
          </Badge>
        </ItemDescription>
      </ItemContent>

      <ItemContent className="items-end">
        <ItemTitle>{formatNum(tx.value)}</ItemTitle>
        <ItemDescription className="text-xs">{operation.label}</ItemDescription>
      </ItemContent>
    </Item>
  )
}
