"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { compactNum, formatNum } from "@/lib/utils"
import type { Asset } from "@fund/fund.types"
import Image from "next/image"

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
                <Item key={item.ticker} className="px-0 py-2">
                  <ItemMedia variant="image">
                    {item.logo_url && (
                      <Image
                        src={item.logo_url}
                        alt={item.name}
                        width={44}
                        height={44}
                        unoptimized
                        loading="eager"
                      />
                    )}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{item.name}</ItemTitle>
                    {item.ticker !== "FX.VND" && (
                      <ItemDescription className="text-xs">
                        {formatNum(item.quantity)}
                        {item.asset_class == "stock"
                          ? " shares"
                          : ` ${item.currency_code}`}
                      </ItemDescription>
                    )}
                  </ItemContent>
                  <ItemContent className="items-end">
                    <ItemDescription>
                      {formatNum(item.total_value)}
                    </ItemDescription>
                    {item.net_profit ? (
                      item.net_profit > 0 ? (
                        <ItemDescription className="text-primary text-xs">
                          +{formatNum(item.net_profit)}
                        </ItemDescription>
                      ) : (
                        <ItemDescription className="text-destructive text-xs">
                          {formatNum(item.net_profit)}
                        </ItemDescription>
                      )
                    ) : null}
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </Item>
        )
      })}
    </ItemGroup>
  )
}
