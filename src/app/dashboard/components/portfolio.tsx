import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshPricesButton, Asset } from "./portfolio-card"
import { useHoldingData } from "@/hooks/useHoldingData"
import { Button } from "@/components/ui/button"

export function Portfolio() {
  const { data: stockData } = useHoldingData()

  const maxVisible = 4
  const hasMore = stockData.length > maxVisible
  const hiddenCount = hasMore ? stockData.length - maxVisible : 0
  const displayedStocks = hasMore ? stockData.slice(0, maxVisible) : stockData

  return (
    <Card variant="glow" className="relative flex flex-col gap-4 h-fit">
      <CardHeader>
        <CardTitle className="text-xl">Portfolio</CardTitle>
        <CardAction>
          <RefreshPricesButton />
        </CardAction>
      </CardHeader>

      <CardContent className="h-fit flex flex-col gap-1">
        {stockData.length > 0 ? (
          <>
            {displayedStocks.map((stock) => (
              <Asset
                key={stock.ticker}
                ticker={stock.ticker}
                name={stock.name}
                logoUrl={stock.logo_url}
                quantity={stock.quantity}
                totalAmount={stock.market_value}
                pnlPct={
                  stock.cost_basis > 0
                    ? (stock.market_value / stock.cost_basis - 1) * 100
                    : 0
                }
                pnlNet={stock.market_value - stock.cost_basis}
                price={stock.price}
                type="stock"
              />
            ))}

            {hasMore && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    // placeholder for future modal or navigation
                    console.log("View full list clicked")
                  }}
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