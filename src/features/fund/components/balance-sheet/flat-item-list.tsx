"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import type { BSItem } from "@fund/fund.types"

export function FlatItemList({ items }: { items: BSItem[] }) {
  return (
    <ItemGroup>
      {items.map((item) => (
        <Item key={item.ticker} size="xs" variant="muted">
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
