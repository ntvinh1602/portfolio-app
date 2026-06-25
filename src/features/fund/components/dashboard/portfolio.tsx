import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import Image from "next/image"
import { formatNum, compactNum, cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { RefreshButton } from "./refresh-button"
import type { BalanceSheet } from "@fund/fund.types"

function Asset({
  name,
  logo_url,
  quantity,
  total_value,
  mkt_price,
  net_profit,
}: {
  name: string
  logo_url: string
  quantity: number
  total_value: number
  mkt_price: number
  net_profit: number
}) {
  const isMobile = useIsMobile()
  const pnlPct = ((net_profit / total_value) - 1) * 100
  const isPositive = net_profit >= 0
  return (
    <Item variant="muted">
      <ItemMedia variant="image">
        <Image
          src={logo_url}
          alt={name}
          width={44}
          height={44}
          unoptimized
          loading="eager"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="block max-w-[180px] truncate">{name}</ItemTitle>
        <ItemDescription className="text-xs">
          {formatNum(quantity)}
          {" units @ "}
          {formatNum(mkt_price / 1000, 2)}
        </ItemDescription>
      </ItemContent>
      <ItemContent className="items-end">
        <ItemTitle>
          {!isMobile ? formatNum(total_value) : compactNum(total_value)}
        </ItemTitle>
        <ItemDescription
          className={cn(
            "flex items-center gap-1 text-xs",
            isPositive ? "text-primary" : "text-destructive"
          )}
        >
          {!isMobile ? (
            <span>
              {compactNum(net_profit)}
              {" ("}{formatNum(pnlPct, 1)}{"%)"}
            </span>
          ) : (
            <span>{formatNum(pnlPct, 1)}%</span>
          )}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
} 

export function Portfolio({
  stocks
}: {
  stocks: BalanceSheet[]
}) {
  // Sort by total value descending
  const sortedStocks = [...stocks].sort(
    (a, b) => b.total_value - a.total_value
  )

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <CardTitle>Portfolio</CardTitle>
        <CardAction>
          <RefreshButton />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {sortedStocks.length > 0 ? (
          sortedStocks.map((stock) => (
            <Asset
              key={stock.ticker}
              name={stock.name}
              logo_url={stock.logo_url || ""}
              quantity={stock.quantity}
              total_value={stock.total_value}
              mkt_price={stock.mkt_price || 0}
              net_profit={stock.net_profit || 0}
            />
          ))
        ) : (
          <span className="self-center py-20 text-muted-foreground">
            No stock holdings.
          </span>
        )}
      </CardContent>
    </Card>
  )
}