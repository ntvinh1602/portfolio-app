import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { RefreshButton } from "./primitive/refresh-button"
import { Asset } from "./primitive/asset-item"

interface StockItem {
  ticker: string
  name: string
  logo_url: string
  quantity: number
  price: number
  cost_basis: number
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