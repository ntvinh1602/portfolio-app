"use client"

import { format } from "date-fns"
import { formatNum } from "@/lib/utils"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import { txOps } from "@fund/config"
import type { Tables } from "@/types/database.types"

export function TxnItem({
  transaction,
}: {
  transaction: {
    [K in keyof Tables<"tx_summary">]: NonNullable<Tables<"tx_summary">[K]>
  }
}) {
  const operationConfig = txOps.find((o) => o.key === transaction.operation)
  const OperationIcon = operationConfig?.icon

  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="icon">{OperationIcon && <OperationIcon />}</ItemMedia>

      <ItemContent>
        <ItemTitle>{transaction.memo}</ItemTitle>
        <ItemDescription className="text-xs">
          {format(new Date(transaction.created_at), "yyyy-MM-dd HH:mm")}
        </ItemDescription>
      </ItemContent>

      <ItemContent className="items-end">
        <ItemTitle>{formatNum(transaction.value)}</ItemTitle>
        <ItemDescription className="text-xs">
          {operationConfig?.label ?? transaction.operation}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}
