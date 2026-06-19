"use client"

import { format } from "date-fns"
import { formatNum } from "@/lib/utils"
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription
} from "@/components/ui/item"
import { operation } from "./labels"

export interface Transaction {
  id: string
  created_at: string
  category: string
  operation: string
  value: number
  memo: string
}

interface TransactionCardProps {
  transaction: Transaction
}

export function TxnItem({ transaction }: TransactionCardProps) {
  const operationConfig = operation.find((o) => o.value === transaction.operation)
  const OperationIcon = operationConfig?.icon

  return (
    <Item variant="outline" size="sm">
      <ItemMedia variant="image" className="border">
        {OperationIcon && <OperationIcon className="stroke-1 size-4"/>}
      </ItemMedia>

      <ItemContent className="min-w-0">
        <ItemTitle>
          {transaction.memo}
        </ItemTitle>
        <ItemDescription>
          {format(new Date(transaction.created_at), "yyyy-MM-dd HH:mm")}
        </ItemDescription>
      </ItemContent>

      <ItemContent className="items-end">
        <ItemTitle>
          {formatNum(transaction.value)}
        </ItemTitle>
        <ItemDescription>
          {operationConfig?.label ?? transaction.operation}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}
