"use client"
import type { BSheetView } from "@fund/fund.types"
import { Box, DollarSign, HandCoins } from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatNum } from "@/lib/utils"
import AssetItem from "@fund/components/asset-item"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"

interface Props {
  bsData: BSheetView[]
  liability: number
  equity: number
}

export default function BalanceSheet({ bsData, liability, equity }: Props) {
  const { liabilities, equities, groupedAssets } = bsData.reduce(
    (acc, item) => {
      if (item.asset_class === "equity") {
        acc.equities.push(item)
      } else if (item.asset_class === "liability") {
        acc.liabilities.push(item)
      } else {
        const key = item.asset_class
        if (!acc.groupedAssets[key]) acc.groupedAssets[key] = []
        acc.groupedAssets[key].push(item)
      }

      return acc
    },
    {
      liabilities: [] as BSheetView[],
      equities: [] as BSheetView[],
      groupedAssets: {} as Record<string, BSheetView[]>,
    },
  )

  const liabilityAssets = [
    {
      label: "Liabilities",
      value: liability,
      icon: HandCoins,
      items: liabilities,
    },
    {
      label: "Equity",
      value: equity,
      icon: DollarSign,
      items: equities,
    },
  ] as const

  return (
    <div className="@container/main flex flex-1 flex-col pb-4">
      <div className="mx-auto grid grid-cols-1 gap-4 px-4 w-full xl:grid-cols-2 xl:max-w-250">
        <Card>
          <CardHeader>
            <CardDescription>Assets</CardDescription>
            <CardTitle className="text-2xl">
              {formatNum(liability + equity)}
            </CardTitle>
            <CardAction>
              <Box className="stroke-1" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              {Object.entries(groupedAssets).map(([assetClass, items]) => {
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
          </CardContent>
        </Card>

        <div className="flex flex-1 flex-col gap-4 w-full">
          {liabilityAssets.map((s) => (
            <Card key={s.label}>
              <CardHeader>
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl">{formatNum(s.value)}</CardTitle>
                <CardAction>
                  <s.icon className="stroke-1" />
                </CardAction>
              </CardHeader>

              <CardContent>
                <ItemGroup className="">
                  {s.items.map((item) => (
                    <Item key={item.ticker} size="sm" variant="muted">
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
