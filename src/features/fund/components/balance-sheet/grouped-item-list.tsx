"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import type { BSItem } from "@fund/components/balance-sheet/types"

export function GroupedItemList({
  groups,
}: {
  groups: Record<string, BSItem[]>
}) {
  return (
    <ItemGroup>
      {Object.entries(groups).map(([assetClass, items]) => {
        const totalValue = items.reduce((sum, i) => sum + (i.total_value ?? 0), 0)

        return (
          <div key={assetClass}>
            <Item variant="muted" size="xs">
              <ItemContent>
                <ItemTitle className="capitalize">{assetClass}</ItemTitle>
              </ItemContent>
              <ItemDescription>{formatNum(totalValue)}</ItemDescription>
            </Item>
            <ItemGroup>
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
          </div>
        )
      })}
    </ItemGroup>
  )
}
