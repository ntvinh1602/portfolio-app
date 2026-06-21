"use client"

import { useBalanceSheetData } from "@/hooks/useBalanceSheet"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  Item,
  ItemGroup,
  ItemTitle,
  ItemContent,
  ItemDescription,
} from "@/components/ui/item"
import { formatNum } from "@/lib/utils"
import { Box, DollarSign, HandCoins } from "lucide-react"

interface BSItem {
  ticker: string
  name: string
  asset_class: string
  total_value: number | null
}

function FlatItemList({ items }: { items: BSItem[] }) {
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

function GroupedItemList({ groups }: { groups: Record<string, BSItem[]> }) {
  return (
    <ItemGroup>
      {Object.entries(groups).map(([assetClass, items]) => {
        const totalValue = items.reduce(
          (sum, i) => sum + (i.total_value ?? 0),
          0
        )
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

export default function Page() {
  const { bsData, totalAssets, totalLiabilities, totalEquity } =
    useBalanceSheetData()

  // Single pass to partition items and group assets by class
  const { assets, liabilities, equities, groupedAssets } = bsData.reduce(
    (acc, item) => {
      if (item.asset_class === "equity") {
        acc.equities.push(item)
      } else if (item.asset_class === "liability") {
        acc.liabilities.push(item)
      } else {
        acc.assets.push(item)
        const key = item.asset_class
        if (!acc.groupedAssets[key]) acc.groupedAssets[key] = []
        acc.groupedAssets[key].push(item)
      }
      return acc
    },
    {
      assets: [] as BSItem[],
      liabilities: [] as BSItem[],
      equities: [] as BSItem[],
      groupedAssets: {} as Record<string, BSItem[]>,
    }
  )

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 w-full xl:w-7/10 2xl:w-6/10 mx-auto xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Assets</CardDescription>
            <CardTitle className="text-2xl">{formatNum(totalAssets)}</CardTitle>
            <CardAction>
              <Box className="stroke-1"/>
            </CardAction>
          </CardHeader>
          <CardContent>
            <GroupedItemList groups={groupedAssets} />
          </CardContent>
        </Card>

        <div className="flex flex-col flex-1 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Liabilities</CardDescription>
              <CardTitle className="text-2xl">{formatNum(totalLiabilities)}</CardTitle>
              <CardAction>
                <HandCoins className="stroke-1"/>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FlatItemList items={liabilities} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Equity</CardDescription>
              <CardTitle className="text-2xl">{formatNum(totalEquity)}</CardTitle>
              <CardAction>
                <DollarSign className="stroke-1"/>
              </CardAction>
            </CardHeader>
            <CardContent>
              <FlatItemList items={equities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
