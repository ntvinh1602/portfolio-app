"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import type { Asset } from "@fund/fund.types"

export function FlatItemList({ items }: { items: Asset[] }) {
  return (
    <ItemGroup className="bg-muted/50 rounded-4xl p-2">
      {items.map((item) => (
        <Item key={item.ticker} size="xs">
          <ItemContent>
            <ItemTitle>{item.name}</ItemTitle>
          </ItemContent>
          <ItemContent>
            <ItemDescription>
              {item.total_value ? formatNum(item.total_value) : "0"}
            </ItemDescription>
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}
