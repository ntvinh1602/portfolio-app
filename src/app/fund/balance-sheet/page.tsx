"use client"

import { useBalanceSheetData } from "@/hooks/useBalanceSheet"
import {
  Card,
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

interface BSItem {
  ticker: string
  name: string
  asset_class: string
  total_value: number | null
}

function SectionHeader({
  label,
  total,
}: {
  label: string
  total: number
}) {
  return (
    <CardHeader>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-2xl">{formatNum(total)}</CardTitle>
    </CardHeader>
  )
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

  const assets = bsData.filter(
    (r) => r.asset_class !== "equity" && r.asset_class !== "liability"
  )
  const liabilities = bsData.filter((r) => r.asset_class === "liability")
  const equities = bsData.filter((r) => r.asset_class === "equity")

  const groupedAssets = assets.reduce((acc, item) => {
    const key = item.asset_class
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, typeof assets>)

  return (
    <div className="@container/main flex flex-1 flex-col gap-2 pb-4">
      <div className="grid grid-cols-1 gap-4 px-4 xl:w-6/10 xl:mx-auto xl:grid-cols-2">
        <div className="flex flex-col flex-1 gap-4">
          <Card>
            <SectionHeader label="Assets" total={totalAssets} />
            <CardContent>
              <GroupedItemList groups={groupedAssets} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <Card>
            <SectionHeader label="Liabilities" total={totalLiabilities} />
            <CardContent>
              <FlatItemList items={liabilities} />
            </CardContent>
          </Card>

          <Card>
            <SectionHeader label="Equity" total={totalEquity} />
            <CardContent>
              <FlatItemList items={equities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
