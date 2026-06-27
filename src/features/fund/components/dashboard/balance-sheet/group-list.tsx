"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import type { Asset } from "@fund/fund.types"
import AssetItem from "@fund/components/asset-item"

export function GroupedItemList({
  groups,
}: {
  groups: Record<string, Asset[]>
}) {
  return (
    <ItemGroup>
      {Object.entries(groups).map(([assetClass, items]) => {
        const totalValue = items.reduce(
          (sum, i) => sum + (i.total_value ?? 0),
          0,
        )

        return (
          <Item key={assetClass} variant="muted" className="gap-1">
            <ItemContent>
              <ItemTitle className="capitalize">{assetClass}</ItemTitle>
            </ItemContent>
            <ItemContent>
              <ItemDescription>{formatNum(totalValue)}</ItemDescription>
            </ItemContent>
            <ItemSeparator />
            <ItemGroup>
              {items.map((item) => (
                <AssetItem
                  variant="bs"
                  key={item.ticker}
                  ticker={item.ticker}
                  name={item.name}
                  asset_class={item.asset_class}
                  currency_code={item.currency_code}
                  logo_url={item.logo_url}
                  quantity={item.quantity}
                  total_value={item.total_value}
                  mkt_price={item.mkt_price}
                  net_profit={item.net_profit}
                />
              ))}
            </ItemGroup>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
