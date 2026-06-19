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

interface StockItem {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  price: number
  cost_basis: number
}

function Asset({
  name,
  logoUrl,
  quantity,
  price,
  costBasis,
}: {
  name: string
  logoUrl: string
  quantity: number
  price: number
  costBasis: number
}) {
  const isMobile = useIsMobile()
  const totalAmount = quantity * price
  const pnlNet = totalAmount - costBasis
  const pnlPct = ((totalAmount / costBasis) - 1) * 100
  const isPositive = pnlNet >= 0

  return (
    <Item variant="muted">
      <ItemMedia variant="image">
        <Image
          src={logoUrl}
          alt={name}
          width={44}
          height={44}
          className="object-cover"
          loading="eager"
        />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="block max-w-[180px] truncate">{name}</ItemTitle>
        <ItemDescription className="text-xs">
          {formatNum(quantity)}
          {" units @ "}
          {formatNum(price / 1000, 2)}
        </ItemDescription>
      </ItemContent>
      <ItemContent className="items-end">
        <ItemTitle>
          {!isMobile ? formatNum(totalAmount) : compactNum(totalAmount)}
        </ItemTitle>
        <ItemDescription
          className={cn(
            "flex items-center gap-1 text-xs",
            isPositive ? "text-primary" : "text-destructive"
          )}
        >
          {!isMobile ? (
            <span>
              {compactNum(pnlNet)}
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

interface PortfolioProps {
  stocks: StockItem[]
}

export function Portfolio({
  stocks
}: PortfolioProps) {
  // Sort by market value (quantity * price) descending
  const sortedStocks = [...stocks].sort(
    (a, b) => b.quantity * b.price - a.quantity * a.price
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
              logoUrl={stock.logo_url}
              quantity={stock.quantity}
              price={stock.price}
              costBasis={stock.cost_basis}
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