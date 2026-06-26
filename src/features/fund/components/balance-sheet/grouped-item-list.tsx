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
import { formatNum } from "@/lib/utils"
import type { Asset } from "@fund/fund.types"
import Image from "next/image"

export function GroupedItemList({
  groups,
}: {
  groups: Record<string, Asset[]>
}) {
  return (
    <ItemGroup className="bg-muted/50 rounded-4xl p-2">
      {Object.entries(groups).map(([assetClass, items]) => {
        const totalValue = items.reduce(
          (sum, i) => sum + (i.total_value ?? 0),
          0,
        )

        return (
          <Item key={assetClass} size="xs">
            <ItemContent>
              <ItemTitle className="capitalize">{assetClass}</ItemTitle>
            </ItemContent>
            <ItemContent>
              <ItemDescription>{formatNum(totalValue)}</ItemDescription>
            </ItemContent>
            <ItemSeparator className="-mb-1" />
            <ItemGroup>
              {items.map((item) => (
                <Item key={item.ticker} size="xs" className="px-0">
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
                      <ItemDescription>
                        {formatNum(item.quantity)}
                        {item.asset_class == "stock"
                          ? " shares"
                          : ` ${item.currency_code}`}
                      </ItemDescription>
                    )}
                  </ItemContent>
                  <ItemContent>
                    <ItemDescription>
                      {formatNum(item.total_value)}
                    </ItemDescription>
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
