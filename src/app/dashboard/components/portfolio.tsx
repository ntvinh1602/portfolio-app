import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { RefreshButton } from "./primitive/refresh-button"
import { Asset } from "./primitive/asset-item"
import { Button } from "@/components/ui/button"

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
  maxVisible?: number
}

export function Portfolio({
  stocks,
  maxVisible = 3
}: PortfolioProps) {
  // Sort by market value (quantity * price) descending
  const sortedStocks = [...stocks].sort(
    (a, b) => b.quantity * b.price - a.quantity * a.price
  )

  const hasMore = sortedStocks.length > maxVisible
  const hiddenCount = hasMore ? sortedStocks.length - maxVisible : 0
  const displayedStocks = hasMore
    ? sortedStocks.slice(0, maxVisible)
    : sortedStocks

  return (
    <Card
      className="flex flex-col gap-4 min-h-90
      backdrop-blur-sm shadow-[0_0_20px_oklch(from_var(--ring)_l_c_h_/0.15)]
      before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-px
      before:bg-gradient-to-r before:from-transparent before:via-ring/40 before:to-transparent"
    >
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="text-lg font-normal">Portfolio</CardTitle>
        <CardAction className="flex gap-2">
          <RefreshButton />
        </CardAction>
      </CardHeader>

      <CardContent className="h-fit flex flex-col gap-1">
        {sortedStocks.length > 0 ? (
          <>
            {displayedStocks.map((stock) => (
              <Asset
                key={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                quantity={stock.quantity}
                price={stock.price}
                costBasis={stock.cost_basis}
              />
            ))}

            {hasMore && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => console.log("Navigate to full holdings")}
                >
                  ...and {hiddenCount} more
                </Button>
              </div>
            )}
          </>
        ) : (
          <span className="self-center py-20 text-muted-foreground">
            No stock holdings.
          </span>
        )}
      </CardContent>
    </Card>
  )
}